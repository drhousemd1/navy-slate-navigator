-- Parent-only after reviewed 20261107020000. Copy this reviewed file under
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
  c uuid:=gen_random_uuid(); c_old uuid:=gen_random_uuid(); original_event uuid;
  progress jsonb; expected jsonb; old_context jsonb; receipt jsonb; old_receipt jsonb; undone jsonb; snapshot jsonb;
  problem text;
begin
  perform pg_temp.check_that(not has_function_privilege('authenticated','public._actions_task_progress(uuid,uuid,timestamp with time zone)','EXECUTE'),'no backdated progress API');
  perform pg_temp.check_that(not has_function_privilege('authenticated','public._execute_task_with_context(uuid,uuid,text,uuid,uuid,jsonb)','EXECUTE'),'no private command bypass');
  perform pg_temp.check_that(public._actions_task_schedule_valid('once','2026-11-07','12:30',null),'once date/time valid');
  perform pg_temp.check_that(public._actions_task_schedule_valid('daily',null,'12:30',null),'daily clock valid');
  perform pg_temp.check_that(public._actions_task_schedule_valid('weekly',null,'12:30',7::smallint),'weekly weekday valid');
  perform pg_temp.check_that(not public._actions_task_schedule_valid('weekly',null,'12:30',null),'weekly requires weekday');
  perform pg_temp.check_that(not public._actions_task_schedule_valid('once',null,'12:30',null),'once requires date');
  perform pg_temp.check_that(not public._actions_task_schedule_valid('daily','2026-11-07','12:30',null),'daily rejects fixed date');
  perform pg_temp.check_that(not public._actions_task_schedule_valid('daily',null,'24:00',null),'reject 24:00');
  perform pg_temp.check_that(not public._actions_task_schedule_valid('daily',null,'12:30:01',null),'minute precision');
  perform pg_temp.check_that(public._notification_due_on('2026-03-08','02:30','America/Boise')='2026-03-08T09:00Z'::timestamptz,'DST gap first valid minute');
  perform pg_temp.check_that(public._notification_due_on('2026-11-01','01:30','America/Boise')='2026-11-01T07:30Z'::timestamptz,'DST fold first occurrence');

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
  insert into public.task_completion_history(task_id,user_id,relationship_id,completed_at) values(imported,sub,period,'2020-01-01T12:00Z');
  perform public.activate_action_accounting(period);
  perform pg_temp.check_that((select count(*)=0 from public.action_events where relationship_id=period and task_id is not null),'cutover invents no task event/award');
  perform set_config('request.headers',jsonb_build_object('x-relationship-session-id',generation)::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  update public.tasks set frequency='once',frequency_count=1 where id=imported;
  progress:=public.get_task_progress(period,imported);
  perform pg_temp.check_that(progress->>'currentCount'='1' and progress->>'completed'='true','imported all-time count prevents a new award after conversion');
  perform pg_temp.check_that(progress->'usageData'='[0,0,0,0,0,0,0]'::jsonb,'old imported completion is outside this week');
  update public.tasks set mandatory=true,deadline_date='2000-01-01',deadline_time='09:00' where id=once_task;
  progress:=public.get_task_progress(period,once_task);expected:=progress->'expectedContext';
  perform pg_temp.check_that(progress->>'overdue'='true' and progress->>'timeZone'='America/Boise','deadline uses beneficiary timezone rather than Dom actor');
  receipt:=public.execute_task_command(c,period,'task_complete',once_task,null,generation,expected);
  perform pg_temp.check_that(receipt->'pointDeltas'->0->>'amount'='7','late mandatory completion earns normal configured points');
  perform pg_temp.check_that(receipt->'taskProgress'->>'completed'='true' and receipt->'taskProgress'->>'lastCompletionLate'='true','late completion recorded');
  perform pg_temp.check_that(public.execute_task_command(c,period,'task_complete',once_task,null,generation,expected)=receipt,'same command retry is identical');
  begin
    perform public.execute_task_command(gen_random_uuid(),period,'task_complete',once_task,null,generation,(public.get_task_progress(period,once_task)->'expectedContext'));
    raise exception 'duplicate once completion accepted';
  exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='TASK_TARGET_REACHED','once capacity guard'); end;
  execute 'reset role';
  original_event:=(receipt->'eventIds'->>0)::uuid;
  select definition_values into snapshot from public.action_events where id=original_event;
  perform pg_temp.check_that(snapshot->>'mandatory'='true' and snapshot->>'late'='true' and snapshot->>'frequency'='once' and snapshot->>'points'='7','event freezes task definition/deadline/late status');
  progress:=public._actions_task_progress(period,once_task,'2030-11-04T18:00Z');
  perform pg_temp.check_that(progress->>'currentCount'='1' and progress->>'completed'='true' and progress->'usageData'='[0,0,0,0,0,0,0]'::jsonb,'once remains complete after many weeks');
  execute 'set local role authenticated';
  update public.tasks set points=99,mandatory=false,deadline_date='2099-01-01',deadline_time='12:00' where id=once_task;
  -- Same accepted command reconciles BEFORE definition/context validation.
  perform pg_temp.check_that(public.execute_task_command(c,period,'task_complete',once_task,null,generation,expected)=receipt,'receipt replay after all task edits');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  undone:=public.undo_action(gen_random_uuid(),period,original_event,generation);
  perform pg_temp.check_that(undone->'pointDeltas'->0->>'amount'='-7' and undone->'taskProgress'->>'currentCount'='0','Sub Undo reverses original award and reopens once');
  execute 'reset role';
  perform pg_temp.check_that((select definition_values=snapshot from public.action_events where id=original_event),'original snapshot unchanged after edit/Undo');
  perform pg_temp.check_that((select definition_values=snapshot from public.action_events where reverses_event_id=original_event),'Undo retains original snapshot');
  perform pg_temp.check_that((select count(*)=2 from public.action_events where task_id=once_task),'original plus reversal retained');

  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  -- An old v1 queued intention is accepted only for an unchanged neutral recurring task.
  progress:=public.get_task_progress(period,recurring);
  old_context:=((progress->'expectedContext') - 'mandatory' - 'deadline' - 'dueAt')||'{"version":1}'::jsonb;
  old_receipt:=public.execute_task_command(c_old,period,'task_complete',recurring,null,generation,old_context);
  update public.tasks set mandatory=true where id=recurring;
  perform pg_temp.check_that(public.execute_task_command(c_old,period,'task_complete',recurring,null,generation,old_context)=old_receipt,'accepted v1 retry remains identical after new feature edit');
  begin
    perform public.execute_task_command(gen_random_uuid(),period,'task_complete',recurring,null,generation,old_context);
    raise exception 'stale v1 mandatory edit accepted';
  exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='ACTION_DEFINITION_CHANGED','v1 new action requires schedule review'); end;
  expected:=public.get_task_progress(period,recurring)->'expectedContext';
  update public.tasks set deadline_time='12:30',deadline_weekday=2 where id=recurring;
  begin
    perform public.execute_task_command(gen_random_uuid(),period,'task_complete',recurring,null,generation,expected);
    raise exception 'stale v2 deadline edit accepted';
  exception when invalid_parameter_value then get stacked diagnostics problem=MESSAGE_TEXT; perform pg_temp.check_that(problem='ACTION_DEFINITION_CHANGED','v2 deadline edit requires review'); end;
  execute 'reset role';
  progress:=public._actions_task_progress(period,recurring,'2026-11-09T00:00Z');
  perform pg_temp.check_that(progress->>'weekStartDate'='2026-11-02' and (progress->>'dueAt')::timestamptz='2026-11-03T19:30Z','weekly Tuesday uses beneficiary Monday week');
  update public.tasks set frequency='daily',deadline_weekday=null,deadline_time='02:30' where id=recurring;
  progress:=public._actions_task_progress(period,recurring,'2026-03-08T08:00Z');
  perform pg_temp.check_that((progress->>'dueAt')::timestamptz='2026-03-08T09:00Z','daily deadline uses same DST gap resolver');
  -- This test never enables delivery or schedules deadline notifications.
  perform pg_temp.check_that(not exists(select 1 from public.notification_configuration where delivery_enabled),'delivery remains disabled');
end $$;
rollback;
