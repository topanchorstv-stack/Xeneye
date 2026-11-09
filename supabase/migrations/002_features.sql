-- Add members by email (engineers only). Account must already exist.
create or replace function add_member_by_email(pid uuid, member_email text, r user_role) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
  if not is_engineer(pid) then raise exception 'Only project engineers can add members'; end if;
  select id into uid from auth.users where lower(email)=lower(member_email);
  if uid is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  insert into project_members values(pid,uid,r) on conflict (project_id,user_id) do update set member_role=excluded.member_role;
end $$;
grant execute on function add_member_by_email(uuid,text,user_role) to authenticated;

-- Automatic activity log
create or replace function log_activity() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into activity_logs(project_id,actor,action,entity,entity_id) values(new.project_id,auth.uid(),TG_ARGV[0],TG_TABLE_NAME,new.id); return new; end $$;
create trigger log_issue after insert on issues for each row execute function log_activity('issue reported');
create trigger log_drawing after insert on drawings for each row execute function log_activity('drawing uploaded');
create trigger log_progress after insert on progress_records for each row execute function log_activity('progress updated');
