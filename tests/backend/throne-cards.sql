-- Preparation only: parent reviews/copies under planning/operations/baseline and
-- runs with the existing guarded local SQL operator after migration 0300.
-- SQL-role checks, not JWT/browser evidence. Every fixture/change rolls back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_setting('obedience.baseline_target',true) is distinct from 'isolated-local' or
    current_setting('cron.launch_active_jobs',true) is distinct from 'off' or
    not coalesce((current_setting('port')='20324' and inet_server_addr()::text in ('127.0.0.1','::1')) or
      (current_setting('port')='5432' and inet_server_addr() is null),false) then raise exception 'REFUSING_NON_PINNED_LOCAL_DATABASE'; end if;
  if exists(select 1 from public.notification_configuration where delivery_enabled) then raise exception 'REAL_DELIVERY_MUST_REMAIN_DISABLED'; end if;
end $$;
create function pg_temp.check_that(p_ok boolean,p_label text) returns void language plpgsql as $$
begin if p_ok is not true then raise exception 'FAILED: %',p_label; end if; end $$;
do $$ declare name text; begin
  select nspname into name from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated',name);
end $$;
do $$
declare owner uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); card_id uuid:=gen_random_uuid();
  command uuid:=gen_random_uuid(); deletion uuid:=gen_random_uuid(); r jsonb; replay jsonb; definition jsonb; image jsonb; invalid jsonb; problem text;
  original_events bigint; original_points bigint; i integer;
begin
  perform pg_temp.check_that(not has_table_privilege('authenticated','public.throne_cards','INSERT') and
    not has_table_privilege('authenticated','public.throne_cards','UPDATE') and not has_table_privilege('authenticated','public.throne_cards','DELETE'),'no direct write bypass');
  perform pg_temp.check_that(not has_table_privilege('anon','public.throne_cards','SELECT'),'anonymous definitions denied');
  perform pg_temp.check_that(not has_function_privilege('anon','public.get_throne_cards()','EXECUTE'),'anonymous RPC denied');
  perform pg_temp.check_that(not has_function_privilege('authenticated','public._throne_validate_image(jsonb)','EXECUTE'),'private validator not exposed');
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  insert into auth.users(id,email,raw_user_meta_data) values
    (owner,'throne-owner-'||owner||'@example.invalid','{"role":"dom"}'),(other,'throne-other-'||other||'@example.invalid','{"role":"sub"}');
  -- Linked profile fields do not confer personal-definition access.
  update public.profiles set linked_partner_id=case when id=owner then other else owner end where id in(owner,other);
  select count(*) into original_events from public.action_events;
  select count(*) into original_points from public.action_point_entries;
  image:=jsonb_build_object('dataUrl','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'metadata',jsonb_build_object('originalSize',100,'compressedSize',68,'compressionRatio',32,'originalDimensions',jsonb_build_object('width',1,'height',1),
      'compressedDimensions',jsonb_build_object('width',1,'height',1),'timestamp','2026-11-07T00:00:00.000Z'));
  -- Use decoded fixture size rather than assuming a metadata constant.
  image:=jsonb_set(image,'{metadata,compressedSize}',to_jsonb(octet_length(decode(split_part(image->>'dataUrl',',',2),'base64'))));
  definition:=jsonb_build_object('title','Private card','description','Owned summary','series','subTasksCompleted','priority','high','iconName',null,'icon',image,
    'titleColor','#22C55E80','descriptionColor',null,'iconColor','#FFFFFF','calendarColor','#7E69AB','images',jsonb_build_array(null,image,null,null,image),
    'opacity',0,'focalX',0,'focalY',null,'highlight',false);
  perform public._throne_validate_definition(definition);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  r:=public.commit_throne_card(owner,card_id,command,0,'save',definition);
  perform pg_temp.check_that(r->>'revision'='1' and r->>'deleted'='false' and r->>'replayed'='false','create receipt');
  perform pg_temp.check_that(public.get_throne_cards()->0->'definition'=definition,'exact colors null zero images metadata preserved');
  replay:=public.commit_throne_card(owner,card_id,command,0,'save',definition);
  perform pg_temp.check_that(replay=r||'{"replayed":true}'::jsonb,'stable replay');
  begin
    perform public.commit_throne_card(owner,card_id,command,0,'save',definition||'{"title":"Changed reuse"}'::jsonb);
    raise exception 'command payload reuse accepted';
  exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='INVALID_INPUT','same command altered payload rejected'); end;
  begin
    perform public.commit_throne_card(owner,card_id,gen_random_uuid(),0,'save',definition);
    raise exception 'stale overwrite accepted';
  exception when serialization_failure then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='CARD_REVISION_CONFLICT','stale revision rejected'); end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other,'role','authenticated')::text,true);
  perform pg_temp.check_that(public.get_throne_cards()='[]'::jsonb and (select count(*)=0 from public.throne_cards where id=card_id),'linked other cannot read via RPC or RLS');
  begin
    perform public.commit_throne_card(owner,card_id,gen_random_uuid(),1,'delete',null);
    raise exception 'actor spoof accepted';
  exception when insufficient_privilege then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='AUTHENTICATION_REQUIRED','actor spoof rejected'); end;
  begin
    perform public.commit_throne_card(other,card_id,gen_random_uuid(),1,'save',definition);
    raise exception 'other owner edit accepted';
  exception when insufficient_privilege then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='CARD_NOT_FOUND','other owner mutation denied'); end;
  execute 'reset role';
  -- Changing relationship role does not transfer another account's definitions.
  update public.profiles set role='dom' where id=other;
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.get_throne_cards()='[]'::jsonb,'role change does not expose cards');
  for i in 1..20 loop perform public.commit_throne_card(other,gen_random_uuid(),gen_random_uuid(),0,'save',definition); end loop;
  begin perform public.commit_throne_card(other,gen_random_uuid(),gen_random_uuid(),0,'save',definition); raise exception 'card count limit bypassed';
  exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='CARD_LIMIT','owner card limit enforced'); end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
  r:=public.commit_throne_card(owner,card_id,gen_random_uuid(),1,'save',definition||'{"title":"Edited"}'::jsonb);
  perform pg_temp.check_that(r->>'revision'='2','owned update increments once');
  r:=public.commit_throne_card(owner,card_id,deletion,2,'delete',null);
  perform pg_temp.check_that(r->>'revision'='3' and public.get_throne_cards()='[]'::jsonb,'delete removes visible card');
  perform pg_temp.check_that(public.commit_throne_card(owner,card_id,deletion,2,'delete',null)=r||'{"replayed":true}'::jsonb,'delete retry stable');
  begin
    perform public.commit_throne_card(owner,card_id,gen_random_uuid(),3,'save',definition);
    raise exception 'deleted ID resurrected';
  exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='CARD_NOT_FOUND','tombstone prevents resurrection'); end;
  execute 'reset role';
  -- Input-boundary rejection cases never produce a saved definition.
  for invalid in select value from jsonb_array_elements(jsonb_build_array(
    definition||'{"opacity":-1}'::jsonb, definition||'{"images":[null]}'::jsonb,
    definition||'{"titleColor":"url(https://external.invalid)"}'::jsonb, definition||'{"usage_data":[1,0,1]}'::jsonb,
    jsonb_set(definition,'{icon,dataUrl}','"https://external.invalid/x.png"'::jsonb),
    jsonb_set(definition,'{icon,metadata,compressedSize}','1'::jsonb),
    jsonb_set(definition,'{images,1,dataUrl}','"data:image/svg+xml;base64,PHN2Zz4="'::jsonb))) loop
    begin perform public._throne_validate_definition(invalid); raise exception 'invalid definition accepted';
    exception when invalid_parameter_value then null; end;
  end loop;
  perform pg_temp.check_that((select count(*)=original_events from public.action_events) and
    (select count(*)=original_points from public.action_point_entries),'no fabricated events or point entries');
  -- Owned deletion fencing and final Auth cascade cover active definitions and tombstones.
  -- Simulate only the established fence and Auth-ready boundary for these
  -- synthetic accounts; this is not a full lifecycle worker execution.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.commit_throne_card(owner,gen_random_uuid(),gen_random_uuid(),0,'save',definition);
  execute 'reset role';
  insert into public.account_deletion_jobs(id,actor_user_id,expected_period_id,expected_session_id,affected_period_ids,recovery_hash,phase,lease_token,lease_until)
    values(gen_random_uuid(),owner,gen_random_uuid(),gen_random_uuid(),'{}',repeat('a',64),'account',gen_random_uuid(),clock_timestamp()+interval '90 seconds');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform pg_temp.check_that((select count(*)=0 from public.throne_cards),'deleting owner RLS fenced');
  begin perform public.get_throne_cards(); raise exception 'deleting owner read accepted';
  exception when insufficient_privilege then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='ACCOUNT_UNAVAILABLE','deleting owner RPC fenced'); end;
  begin perform public.commit_throne_card(owner,gen_random_uuid(),gen_random_uuid(),0,'save',definition); raise exception 'deleting owner write accepted';
  exception when insufficient_privilege then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='ACCOUNT_UNAVAILABLE','deleting owner write fenced'); end;
  execute 'reset role';
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  -- The existing Auth guard requires lifecycle profile/member detachment before
  -- final Auth removal. Detach only the rollback fixture's own records.
  update public.profiles set linked_partner_id=null where id in(owner,other);
  delete from public.relationship_period_members where user_id=owner;
  delete from public.profiles where id=owner;
  delete from auth.users where id=owner;
  perform pg_temp.check_that(not exists(select 1 from public.throne_cards where user_id=owner),'final Auth deletion cascades owned card/tombstone');
  perform pg_temp.check_that(exists(select 1 from auth.users where id=other) and
    (select count(*)=20 from public.throne_cards where user_id=other),'other account and all its cards preserved');
end $$;
rollback;
