-- PREPARED ONLY. Run after parent-reviewed migration on the pinned local runtime,
-- before assigning a real owner or performing browser logo QA. No Edge/network
-- calls. Synthetic storage rows test SQL invariants, not actual image bytes.
-- Copy this reviewed file under planning/operations/baseline, then use its
-- run_local_sql.py --operator wrapper. All fixtures and selections roll back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_setting('obedience.baseline_target',true) is distinct from 'isolated-local' or
    current_setting('cron.launch_active_jobs',true) is distinct from 'off' or
    not coalesce((current_setting('port')='20324' and inet_server_addr()::text in ('127.0.0.1','::1')) or
      (current_setting('port')='5432' and inet_server_addr() is null),false) then raise exception 'REFUSING_NON_PINNED_LOCAL_DATABASE'; end if;
  if exists(select 1 from public.app_branding_owner) or exists(select 1 from public.app_logo_selections) or
    (select count(*) from public.app_logo_versions)<>1 or
    (select revision<>0 or version_id<>'00000000-0000-4000-8000-000000000001'::uuid from public.app_branding_state) then
    raise exception 'REQUIRES_UNASSIGNED_INITIAL_BRANDING_STATE'; end if;
end $$;
create temporary table branding_bucket_baseline on commit drop as select id,to_jsonb(b) saved from storage.buckets b;
create temporary table branding_original_profiles on commit drop as select id,to_jsonb(p) saved from public.profiles p;
create function pg_temp.check_that(ok boolean,label text) returns void language plpgsql as $$ begin
  if ok is not true then raise exception 'FAILED: %',label; end if;
end $$;
do $$ declare name text; begin select nspname into name from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated,anon',name); end $$;
do $$
declare owner_id uuid:=gen_random_uuid(); ordinary uuid:=gen_random_uuid(); upload_id uuid:=gen_random_uuid(); restore_id uuid:=gen_random_uuid();
  original_id uuid:='00000000-0000-4000-8000-000000000001'; pathname text; payload jsonb; result jsonb; t text; r text; failure text;
begin
  foreach r in array array['anon','authenticated'] loop
    foreach t in array array['app_branding_owner','app_logo_versions','app_branding_state','app_logo_selections'] loop
      perform pg_temp.check_that(not has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE'),r||' cannot directly read/write '||t);
    end loop;
    perform pg_temp.check_that(not has_function_privilege(r,'public.branding_commit(uuid,uuid,bigint,uuid,jsonb)','EXECUTE'),'no direct commit');
    perform pg_temp.check_that(not has_function_privilege(r,'public.branding_check_owner(uuid)','EXECUTE'),'no actor-forged owner check');
    perform pg_temp.check_that(not has_function_privilege(r,'public.branding_get_version(uuid,uuid)','EXECUTE'),'no actor-forged archive read');
    perform pg_temp.check_that(not has_function_privilege(r,'public._branding_version(uuid)','EXECUTE'),'no public internal version lookup');
  end loop;
  perform pg_temp.check_that(not has_function_privilege('anon','public.get_app_branding_history()','EXECUTE'),'anonymous cannot list archive');
  perform set_config('request.jwt.claims','{"role":"anon"}',true); execute 'set local role anon';
  result:=public.get_app_branding();
  perform pg_temp.check_that(result->>'revision'='0' and result#>>'{version,id}'=original_id::text and
    result-array['revision','version']='{}'::jsonb,'anonymous sees only initial public metadata');
  execute 'reset role';
  insert into auth.users(id,email,raw_user_meta_data) values
    (owner_id,'branding-owner-'||owner_id||'@example.invalid','{"role":"sub"}'),
    (ordinary,'branding-reader-'||ordinary||'@example.invalid','{"role":"dom"}');
  -- A relationship Dom and a document reader still are not the branding owner.
  -- No real account is granted any capability, even temporarily.
  insert into public.app_branding_owner(singleton,user_id) values(true,owner_id);
  insert into public.admin_document_readers(user_id) values(ordinary);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ordinary,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.can_read_admin_document(),'synthetic document membership is active');
  perform pg_temp.check_that(not public.get_my_branding_access(),'ordinary Dom/document reader cannot edit');
  begin perform public.get_app_branding_history(); raise exception 'archive read unexpectedly allowed';
    exception when insufficient_privilege then null; end;
  begin insert into public.app_branding_owner values(true,ordinary); raise exception 'self-grant unexpectedly allowed';
    exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,name) values('app-branding','forged'); raise exception 'direct upload unexpectedly allowed';
    exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.get_my_branding_access(),'explicit owner can edit independent of Sub role');
  perform pg_temp.check_that(jsonb_array_length(public.get_app_branding_history()->'versions')=1,'owner sees original archive choice');
  begin insert into storage.objects(bucket_id,name) values('app-branding','owner-direct'); raise exception 'owner bypass upload unexpectedly allowed';
    exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  pathname:='versions/'||upload_id||'/'||repeat('a',64)||'.png';
  payload:=jsonb_build_object('objectPath',pathname,'mimeType','image/png','byteSize',70,'sha256',repeat('a',64));
  begin perform public.branding_commit(owner_id,upload_id,0,upload_id,payload); raise exception 'missing object unexpectedly committed';
    exception when invalid_parameter_value then get stacked diagnostics failure=message_text; perform pg_temp.check_that(failure='LOGO_OBJECT_UNVERIFIED','missing object rejected'); end;
  insert into storage.objects(bucket_id,name,metadata) values('app-branding',pathname,'{"mimetype":"image/png","size":70}');
  result:=public.branding_commit(owner_id,upload_id,0,upload_id,payload);
  perform pg_temp.check_that(result->>'revision'='1' and result->>'replayed'='false','initial upload commits once');
  result:=public.branding_commit(owner_id,upload_id,0,upload_id,payload);
  perform pg_temp.check_that(result->>'revision'='1' and result->>'replayed'='true','lost-response retry replays once');
  begin perform public.branding_commit(owner_id,upload_id,0,original_id,null); raise exception 'reused command unexpectedly committed';
    exception when unique_violation then get stacked diagnostics failure=message_text; perform pg_temp.check_that(failure='COMMAND_ID_REUSED','different intent rejected'); end;
  begin perform public.branding_commit(owner_id,gen_random_uuid(),0,original_id,null); raise exception 'stale selection unexpectedly committed';
    exception when serialization_failure then get stacked diagnostics failure=message_text; perform pg_temp.check_that(failure='LOGO_REVISION_CONFLICT','stale revision rejected'); end;
  begin perform public.branding_commit(owner_id,gen_random_uuid(),1,gen_random_uuid(),null); raise exception 'unknown version unexpectedly restored';
    exception when no_data_found then null; end;
  result:=public.branding_commit(owner_id,restore_id,1,original_id,null);
  perform pg_temp.check_that(result->>'revision'='2' and result->>'replayed'='false','original artwork restored');
  result:=public.branding_commit(owner_id,restore_id,1,original_id,null);
  perform pg_temp.check_that(result->>'revision'='2' and result->>'replayed'='true','restore retry appends no duplicate history');
  result:=public.branding_commit(owner_id,gen_random_uuid(),2,upload_id,null);
  perform pg_temp.check_that(result->>'revision'='3','uploaded artwork can be restored again');
  perform pg_temp.check_that((select count(*)=2 from public.app_logo_versions) and (select count(*)=3 from public.app_logo_selections),'immutable versions and all three selections retained');
  perform pg_temp.check_that(exists(select 1 from storage.objects where bucket_id='app-branding' and name=pathname),'restore never removes prior bytes');
  delete from public.app_branding_owner where user_id=owner_id;
  begin perform public.branding_commit(owner_id,gen_random_uuid(),3,original_id,null); raise exception 'revoked owner unexpectedly committed';
    exception when insufficient_privilege then get stacked diagnostics failure=message_text; perform pg_temp.check_that(failure='BRANDING_OWNER_REQUIRED','commit rechecks membership'); end;
  insert into public.app_branding_owner values(true,owner_id);
  insert into public.account_deletion_jobs(id,actor_user_id,expected_period_id,expected_session_id,affected_period_ids,recovery_hash)
    values(gen_random_uuid(),owner_id,gen_random_uuid(),gen_random_uuid(),'{}',repeat('b',64));
  begin perform public.branding_commit(owner_id,gen_random_uuid(),3,original_id,null); raise exception 'frozen owner unexpectedly committed';
    exception when insufficient_privilege then get stacked diagnostics failure=message_text; perform pg_temp.check_that(failure='ACCOUNT_UNAVAILABLE','account lifecycle rechecked'); end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform pg_temp.check_that(not public.get_my_branding_access(),'frozen owner UI capability false');
  begin perform public.get_app_branding_history(); raise exception 'frozen archive unexpectedly allowed'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform pg_temp.check_that(not exists(select 1 from branding_bucket_baseline old full join storage.buckets b on b.id=old.id where old.saved is distinct from to_jsonb(b)),'all bucket settings preserved');
  perform pg_temp.check_that(not exists(select 1 from branding_original_profiles old left join public.profiles p on p.id=old.id where old.saved is distinct from to_jsonb(p)),'all original profiles preserved');
end $$;
rollback;
