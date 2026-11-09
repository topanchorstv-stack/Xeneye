-- DEMO DATA ONLY. Requires at least one account promoted to engineer:
--   update profiles set role='engineer' where id='<uuid>';
-- Subcontractor accounts cannot be created safely in SQL: sign up two users, then add them on the project's Members tab.
do $$
declare eng uuid; p uuid; b1 uuid; b2 uuid; f1 uuid; f2 uuid; f3 uuid; a1 uuid; a2 uuid; a3 uuid; a4 uuid;
begin
  select id into eng from profiles where role='engineer' limit 1;
  if eng is null then raise notice 'No engineer found; promote one first.'; return; end if;
  insert into projects(name,number,client,address,description,created_by,timezone)
    values('DEMO - Riverside Offices','DEMO-001','Demo Client','1 Demo Street','Demo data: safe to delete',eng,'UTC') returning id into p;
  insert into buildings(project_id,name) values(p,'Building A') returning id into b1;
  insert into buildings(project_id,name) values(p,'Building B') returning id into b2;
  insert into floors(project_id,building_id,name) values(p,b1,'Floor 1') returning id into f1;
  insert into floors(project_id,building_id,name) values(p,b1,'Floor 2') returning id into f2;
  insert into floors(project_id,building_id,name) values(p,b2,'Floor 1') returning id into f3;
  insert into areas(project_id,floor_id,name) values(p,f1,'Area A') returning id into a1;
  insert into areas(project_id,floor_id,name) values(p,f1,'Area B') returning id into a2;
  insert into areas(project_id,floor_id,name) values(p,f2,'Area A') returning id into a3;
  insert into areas(project_id,floor_id,name) values(p,f3,'Area A') returning id into a4;
  insert into progress_records(project_id,area_id,status,percent,note,updated_by) values
    (p,a1,'completed',100,'DEMO',eng),(p,a2,'in_progress',60,'DEMO',eng),(p,a3,'in_progress',25,'DEMO',eng),(p,a4,'not_started',0,'DEMO',eng);
  insert into issues(project_id,title,description,area_id,category,severity,reported_by)
    values(p,'DEMO: Conduit clash at gridline C','Demo issue',a2,'coordination','high',eng);
end $$;
