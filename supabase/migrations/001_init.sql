-- XenEye MVP schema + RLS. Run in the Supabase SQL editor or `supabase db push`.
create extension if not exists pgcrypto;
create type user_role as enum ('engineer','subcontractor');
create type work_status as enum ('not_started','in_progress','completed','issue');
create type issue_status as enum ('reported','under_review','assigned','resolved','closed');

create table profiles(id uuid primary key references auth.users on delete cascade,
  full_name text, role user_role not null default 'subcontractor', created_at timestamptz default now());
-- Self-signup always creates a subcontractor; engineers are promoted by an admin so roles can't be self-assigned.
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user after insert on auth.users for each row execute function handle_new_user();

create table projects(id uuid primary key default gen_random_uuid(), name text not null, number text, client text,
  address text, description text, start_date date, expected_completion date, status text default 'active',
  timezone text default 'UTC', created_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz default now(), updated_at timestamptz default now());
create table project_members(project_id uuid references projects on delete cascade, user_id uuid references profiles on delete cascade,
  member_role user_role not null, primary key(project_id,user_id));
create table buildings(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade, name text not null, created_at timestamptz default now());
create table floors(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade, building_id uuid not null references buildings on delete cascade, name text not null, created_at timestamptz default now());
create table areas(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade, floor_id uuid not null references floors on delete cascade, name text not null, created_at timestamptz default now());
create table drawings(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  name text not null, number text, type text, building_id uuid references buildings on delete set null, floor_id uuid references floors on delete set null,
  area_id uuid references areas on delete set null, revision text default 'A', file_path text not null, file_size bigint,
  uploaded_by uuid references profiles(id) default auth.uid(), created_at timestamptz default now());
create table drawing_annotations(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  drawing_id uuid not null references drawings on delete cascade, area_id uuid references areas on delete set null,
  revision text, page int not null default 1,
  kind text not null check (kind in ('line','freehand','rect','circle','arrow','text')),
  status work_status not null default 'not_started',
  geometry jsonb not null, -- coordinates normalized 0..1 of the PDF page, so zoom/resize never shifts them
  label text, created_by uuid references profiles(id) default auth.uid(), created_at timestamptz default now(), updated_at timestamptz default now());
create table issues(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  title text not null, description text, building_id uuid references buildings, floor_id uuid references floors, area_id uuid references areas,
  drawing_id uuid references drawings, drawing_page int,
  category text not null check (category in ('design','material_shortage','labor_shortage','equipment','site_condition','quality','safety','coordination','other')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status issue_status not null default 'reported', reported_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz default now());
create table issue_attachments(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  issue_id uuid not null references issues on delete cascade, file_path text not null, uploaded_by uuid references profiles(id) default auth.uid(), created_at timestamptz default now());
create table progress_records(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  area_id uuid not null references areas on delete cascade, status work_status not null, percent int check (percent between 0 and 100),
  note text, updated_by uuid references profiles(id) default auth.uid(), created_at timestamptz default now());
create table activity_logs(id uuid primary key default gen_random_uuid(), project_id uuid not null references projects on delete cascade,
  actor uuid references profiles(id) default auth.uid(), action text not null, entity text, entity_id uuid, created_at timestamptz default now());
create index on project_members(user_id); create index on buildings(project_id); create index on floors(building_id);
create index on areas(floor_id); create index on drawings(project_id); create index on drawing_annotations(drawing_id,page);
create index on issues(project_id,status); create index on progress_records(area_id,created_at desc);

-- Issue origin is authoritative: ordinary users cannot alter who/when an issue was reported.
create function lock_issue_origin() returns trigger language plpgsql as $$
begin new.created_at:=old.created_at; new.reported_by:=old.reported_by; new.project_id:=old.project_id; new.updated_at:=now(); return new; end $$;
create trigger issues_lock before update on issues for each row execute function lock_issue_origin();
create function touch() returns trigger language plpgsql as $$ begin new.updated_at:=now(); return new; end $$;
create trigger t1 before update on projects for each row execute function touch();
create trigger t2 before update on drawing_annotations for each row execute function touch();

-- Access helpers (security definer avoids RLS recursion on project_members)
create function is_member(pid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from project_members where project_id=pid and user_id=auth.uid()) $$;
create function is_engineer(pid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from project_members where project_id=pid and user_id=auth.uid() and member_role='engineer') $$;

do $$ declare t text; begin
 foreach t in array array['profiles','projects','project_members','buildings','floors','areas','drawings','drawing_annotations','issues','issue_attachments','progress_records','activity_logs']
 loop execute format('alter table %I enable row level security',t); end loop; end $$;

create policy prof_read on profiles for select using (auth.uid() is not null);
create policy prof_upd on profiles for update using (id=auth.uid()) with check (id=auth.uid() and role=(select role from profiles where id=auth.uid()));

create policy proj_read on projects for select using (is_member(id));
create policy proj_ins on projects for insert with check (exists(select 1 from profiles where id=auth.uid() and role='engineer'));
create policy proj_upd on projects for update using (is_engineer(id));
create policy proj_del on projects for delete using (is_engineer(id));
-- creator becomes project engineer automatically
create function add_creator() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into project_members values(new.id,new.created_by,'engineer'); return new; end $$;
create trigger proj_creator after insert on projects for each row execute function add_creator();

create policy pm_read on project_members for select using (is_member(project_id));
create policy pm_write on project_members for all using (is_engineer(project_id)) with check (is_engineer(project_id));

-- Structure + drawings: members read, engineers write
do $$ declare t text; begin
 foreach t in array array['buildings','floors','areas','drawings'] loop
  execute format('create policy %1$s_r on %1$I for select using (is_member(project_id))',t);
  execute format('create policy %1$s_w on %1$I for all using (is_engineer(project_id)) with check (is_engineer(project_id))',t);
 end loop; end $$;

-- Annotations / progress / issues: any member inserts; engineers edit all, others edit only their own
create policy ann_r on drawing_annotations for select using (is_member(project_id));
create policy ann_i on drawing_annotations for insert with check (is_member(project_id) and created_by=auth.uid());
create policy ann_u on drawing_annotations for update using (created_by=auth.uid() or is_engineer(project_id));
create policy ann_d on drawing_annotations for delete using (created_by=auth.uid() or is_engineer(project_id));
create policy iss_r on issues for select using (is_member(project_id));
create policy iss_i on issues for insert with check (is_member(project_id) and reported_by=auth.uid());
create policy iss_u on issues for update using (reported_by=auth.uid() or is_engineer(project_id));
create policy att_r on issue_attachments for select using (is_member(project_id));
create policy att_i on issue_attachments for insert with check (is_member(project_id) and uploaded_by=auth.uid());
create policy att_d on issue_attachments for delete using (uploaded_by=auth.uid() or is_engineer(project_id));
create policy pr_r on progress_records for select using (is_member(project_id));
create policy pr_i on progress_records for insert with check (is_member(project_id) and updated_by=auth.uid());
create policy log_r on activity_logs for select using (is_member(project_id));
create policy log_i on activity_logs for insert with check (is_member(project_id) and actor=auth.uid());

-- Private storage. Object paths must start with "<project_id>/".
insert into storage.buckets(id,name,public,file_size_limit) values
 ('drawings','drawings',false,52428800),('issue-photos','issue-photos',false,10485760) on conflict do nothing;
create policy st_read on storage.objects for select using (bucket_id in ('drawings','issue-photos') and is_member((split_part(name,'/',1))::uuid));
create policy st_draw_w on storage.objects for insert with check (bucket_id='drawings' and is_engineer((split_part(name,'/',1))::uuid));
create policy st_photo_w on storage.objects for insert with check (bucket_id='issue-photos' and is_member((split_part(name,'/',1))::uuid));
