-- Parent-only after reviewed 20261107040000. Copy this reviewed file under
-- planning/operations/baseline before using run_local_sql.py --operator.
-- SQL-role coverage, not JWT/browser acceptance. All fixtures and changes ROLLBACK.
-- No original accounts, service setting changes, email, scheduler or network sends.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_setting('obedience.baseline_target',true) is distinct from 'isolated-local' or
    current_setting('cron.launch_active_jobs',true) is distinct from 'off' or
    not coalesce((current_setting('port')='20324' and inet_server_addr()::text in ('127.0.0.1','::1')) or
      (current_setting('port')='5432' and inet_server_addr() is null),false) then
    raise exception 'REFUSING_NON_PINNED_LOCAL_DATABASE'; end if;
  if exists(select 1 from public.notification_configuration where delivery_enabled) then
    raise exception 'REAL_DELIVERY_MUST_REMAIN_DISABLED'; end if;
end $$;
create function pg_temp.check_that(p_ok boolean,p_label text) returns void language plpgsql as $$
begin if p_ok is not true then raise exception 'FAILED: %',p_label; end if; end $$;
do $$ declare name text; begin
  select nspname into name from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated',name);
end $$;
do $$
declare dom uuid:=gen_random_uuid(); sub uuid:=gen_random_uuid(); period uuid; generation uuid;
 dom_member uuid; sub_member uuid; imported uuid:=gen_random_uuid(); once_task uuid:=gen_random_uuid(); recurring uuid:=gen_random_uuid();
 c uuid:=gen_random_uuid(); c_v2 uuid:=gen_random_uuid(); undo_id uuid:=gen_random_uuid(); denied_id uuid:=gen_random_uuid();
 progress jsonb; expected jsonb; modern jsonb; receipt jsonb; stored jsonb; replay jsonb; undone jsonb; before_counts jsonb; after_counts jsonb; evidence jsonb; problem text;
begin
 perform pg_temp.check_that(not has_function_privilege('anon','public._actions_compatible_task_progress(jsonb)','EXECUTE') and
  not has_function_privilege('authenticated','public._actions_compatible_task_progress(jsonb)','EXECUTE') and
  not has_function_privilege('service_role','public._actions_compatible_task_progress(jsonb)','EXECUTE'),'projection helper is private');
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  insert into auth.users(id,email,raw_user_meta_data) values
    (dom,'task-types-dom-'||dom||'@example.invalid','{"role":"dom"}'),
    (sub,'task-types-sub-'||sub||'@example.invalid','{"role":"sub"}');
  update public.profiles set role='dom',timezone='Pacific/Kiritimati',dom_points=0,linked_partner_id=sub where id=dom;
  update public.profiles set role='sub',timezone='America/Boise',points=0,linked_partner_id=dom where id=sub;
  insert into public.relationship_periods default values returning id,relationship_session_id into period,generation;
  insert into public.relationship_period_members(relationship_id,user_id,role) values(period,dom,'dom') returning participant_id into dom_member;
  insert into public.relationship_period_members(relationship_id,user_id,role) values(period,sub,'sub') returning participant_id into sub_member;
  update public.identity_contexts set relationship_id=period where user_id in(dom,sub);
  insert into public.tasks(id,user_id,relationship_id,title,points,frequency,frequency_count,is_dom_task) values
    (imported,sub,period,'Imported recurring task',5,'daily',1,false),
    (once_task,sub,period,'One-time task',7,'once',1,false),
    (recurring,sub,period,'Neutral recurring task',3,'weekly',10,false);
  perform public.activate_action_accounting(period);
  perform pg_temp.check_that((select count(*)=0 from public.action_events where relationship_id=period and task_id is not null),'cutover invents no task event/award');
  perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation,'x-task-context-version','2')::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated';

 -- Headerless frozen client gets exact v1 only for neutral recurring tasks.
 perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation)::text,true);
 progress:=public.get_task_progress(period,recurring);expected:=progress->'expectedContext';
 perform pg_temp.check_that(expected->>'version'='1' and not(expected ?| array['mandatory','deadline','dueAt']),'neutral read is v1');
 perform pg_temp.check_that(public.get_task_progress(period,once_task)#>>'{expectedContext,version}'='2','once never disguised as legacy');
 receipt:=public.execute_task_command(c,period,'task_complete',recurring,null,generation,expected);
 perform pg_temp.check_that(receipt#>>'{taskProgress,expectedContext,version}'='1','old forward receipt decodes');
 perform pg_temp.check_that(receipt=public.get_my_action_receipt(c,period),'recovery matches forward representation');
 evidence:=jsonb_build_object('progress',progress,'receipt',receipt,'command',jsonb_build_object('commandId',c,'expectedRelationshipId',period,'kind','task_complete','taskId',recurring,'expectedContext',expected),'session',generation);
 execute 'reset role';
 select r.receipt into stored from public.action_command_receipts r where command_id=c;
 perform pg_temp.check_that(stored#>>'{taskProgress,expectedContext,version}'='2','stored canonical receipt is not rewritten');
 modern:=public._actions_task_progress(period,recurring,statement_timestamp());
 -- Unknown/nonneutral shapes are returned untouched, never broadly stripped.
 perform pg_temp.check_that(public._actions_compatible_task_progress(modern||'{"mandatory":true}'::jsonb)=(modern||'{"mandatory":true}'::jsonb),'mismatched outer schedule stays unchanged');
 perform pg_temp.check_that(public._actions_compatible_task_progress(jsonb_set(modern,'{expectedContext,mandatory}','true'))=jsonb_set(modern,'{expectedContext,mandatory}','true'),'context mandatory stays unchanged');
 perform pg_temp.check_that(public._actions_compatible_task_progress(jsonb_set(modern,'{dueAt}','"2026-11-07T12:00:00Z"'))=jsonb_set(modern,'{dueAt}','"2026-11-07T12:00:00Z"'),'resolved deadline stays unchanged');
 execute 'set local role authenticated';
 perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation,'x-task-context-version','2')::text,true);
 perform pg_temp.check_that(public.get_my_action_receipt(c,period)=stored,'modern recovery returns exact stored receipt');
 perform pg_temp.check_that(public.get_task_progress(period,recurring)#>>'{expectedContext,version}'='2','modern read stays v2');
 -- A pre0400 v2 neutral queued intention remains valid without being rewritten.
 replay:=public.execute_task_command(c_v2,period,'task_complete',recurring,null,generation,modern->'expectedContext');
 perform pg_temp.check_that(replay#>>'{taskProgress,expectedContext,version}'='2','v2 queued neutral intention still succeeds');
 update public.tasks set mandatory=true,points=99 where id=recurring;
 perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation)::text,true);
 perform pg_temp.check_that(public.execute_task_command(c,period,'task_complete',recurring,null,generation,expected)=receipt,'old accepted retry uses frozen neutral receipt before validation');
 execute 'reset role';
 select jsonb_build_object('events',(select count(*) from public.action_events where relationship_id=period),'points',(select count(*) from public.action_point_entries where relationship_id=period),'receipts',(select count(*) from public.action_command_receipts where relationship_id=period)) into before_counts;
 execute 'set local role authenticated';
 begin
  perform public.execute_task_command(denied_id,period,'task_complete',recurring,null,generation,expected);
  raise exception 'stale v1 schedule accepted';
 exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='ACTION_DEFINITION_CHANGED','v1 schedule rejection is unchanged'); end;
 begin
  perform public.undo_action(undo_id,period,(receipt->'eventIds'->>0)::uuid,generation);
  raise exception 'headerless scheduled Undo accepted';
 exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='TASK_CLIENT_UPDATE_REQUIRED','legacy Undo requires update before writes'); end;
 execute 'reset role';
 select jsonb_build_object('events',(select count(*) from public.action_events where relationship_id=period),'points',(select count(*) from public.action_point_entries where relationship_id=period),'receipts',(select count(*) from public.action_command_receipts where relationship_id=period)) into after_counts;
 perform pg_temp.check_that(before_counts=after_counts,'rejections made no event ledger or receipt writes');
 execute 'set local role authenticated';
 perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation,'x-task-context-version','2')::text,true);
 undone:=public.undo_action(undo_id,period,(receipt->'eventIds'->>0)::uuid,generation);
 perform pg_temp.check_that(undone#>>'{pointDeltas,0,amount}'='-3' and undone#>>'{taskProgress,expectedContext,mandatory}'='true','modern Undo reverses original3 not current99 and retains schedule');
 perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation)::text,true);
 perform pg_temp.check_that(public.undo_action(undo_id,period,(receipt->'eventIds'->>0)::uuid,generation)=undone,'accepted Undo receipt wins over later missing capability');
 -- No misleading downgrade of already-stored scheduled receipts for old decoders.
 perform pg_temp.check_that(public.get_my_action_receipt(undo_id,period)=undone,'scheduled stored receipt kept intact for updated reader');
 execute 'reset role';
 perform pg_temp.check_that((select r.receipt=stored from public.action_command_receipts r where command_id=c),'original stored receipt unchanged throughout');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 perform pg_temp.check_that(public.get_my_action_receipt(c,period) is null,'peer cannot enumerate actor receipt');
 execute 'reset role';
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.get_my_action_receipt(c,period);raise exception 'anonymous receipt accepted';
 exception when insufficient_privilege then get stacked diagnostics problem=MESSAGE_TEXT;perform pg_temp.check_that(problem='AUTHENTICATION_REQUIRED','anonymous denied'); end;
 perform set_config('obedience.task_compatibility_evidence',evidence::text,true);
end $$;
-- Full SYNTHETIC transport values for the frozen-client decoder test; no credentials/media.
select current_setting('obedience.task_compatibility_evidence')::jsonb;
rollback;
