-- Parent must review/apply 1100 and release the local fixture
-- lease first. psql -X -v ON_ERROR_STOP=1 --file tests/backend/notifications.sql
-- Use ONLY run_local_sql.py's pinned native database at 127.0.0.1:20324.
-- Its verified proxy can report server port 5432 and a Unix socket (NULL address).
-- This transaction creates synthetic accounts and temporarily disables original
-- reminders; every write rolls back. No Edge invocation or network send.
-- This tests SQL role/RPC behavior, not JWT gateway or real-device delivery.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_setting('obedience.baseline_target',true) is distinct from 'isolated-local' or
    current_setting('cron.launch_active_jobs',true) is distinct from 'off' or
    not coalesce((current_setting('port')='20324' and inet_server_addr()::text in ('127.0.0.1','::1')) or
      (current_setting('port')='5432' and inet_server_addr() is null),false) then
    raise exception 'REFUSING_NON_PINNED_LOCAL_DATABASE'; end if;
  if exists(select 1 from public.identity_contexts where lifecycle_ready) or
    exists(select 1 from public.action_accounting_periods where accounting_enabled) or
    exists(select 1 from public.notification_jobs where state='pending') or
    exists(select 1 from public.notification_deliveries where state in ('pending','leased')) then
    raise exception 'EXCLUSIVE_EMPTY_NOTIFICATION_FIXTURE_REQUIRED'; end if;
end $$;
-- Hold the original rows stable and preserve their exact values/IDs before any
-- changes. Disabling only these rows prevents the scheduler test from claiming
-- an original restored reminder. Neither this snapshot nor the disable commits.
lock table public.wellness_reminders in share row exclusive mode;
create temporary table notification_original_reminders on commit drop as
  select id,to_jsonb(w) saved_row,
    (select count(*) from public.notification_jobs j where j.source_kind='reminder' and j.source_id=w.id) existing_job_count
    from public.wellness_reminders w;
select md5(coalesce(jsonb_agg(saved_row order by id),'[]'::jsonb)::text) as reminders_hash
  from notification_original_reminders
\gset notification_baseline_
update public.wellness_reminders set enabled=false where id in
  (select id from notification_original_reminders where (saved_row->>'enabled')::boolean);
create function pg_temp.check_that(p_ok boolean,p_label text) returns void language plpgsql as $$
begin if p_ok is not true then raise exception 'FAILED: %',p_label; end if; end $$;
do $$ declare name text; begin
  select nspname into name from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated',name);
end $$;

do $$
declare
  dom uuid:=gen_random_uuid(); sub uuid:=gen_random_uuid(); period uuid; generation uuid;
  dom_member uuid; sub_member uuid; conversation uuid; command uuid; reward uuid; event uuid;
  device_a uuid:=gen_random_uuid(); device_b uuid:=gen_random_uuid(); device_dom uuid:=gen_random_uuid();
  key_id text:=repeat('a',64);
  key_public text:=rtrim(translate(replace(encode(decode('04'||repeat('11',64),'hex'),'base64'),chr(10),''),'+/','-_'),'=');
  key_auth text:=rtrim(translate(encode(decode(repeat('22',16),'hex'),'base64'),'+/','-_'),'=');
  ep_a text:='https://fcm.googleapis.com/fcm/send/notification-synthetic-a-'||gen_random_uuid();
  ep_b text:='https://fcm.googleapis.com/fcm/send/notification-synthetic-b-'||gen_random_uuid();
  ep_dom text:='https://fcm.googleapis.com/fcm/send/notification-synthetic-dom-'||gen_random_uuid();
  receipt jsonb; again jsonb; args jsonb; claims jsonb; claim jsonb; previous_claim jsonb; ready jsonb;
  test_command uuid:=gen_random_uuid(); test_receipt jsonb; test_job uuid;
  reminder uuid; wellbeing uuid; before_count integer; initial_count integer;
  verified_a timestamptz;
  metrics jsonb:='{"anxiety":50,"stress":50,"irritability":50,"overwhelm":50,"energy":50,"intimacy":50,"physical_touch":50,"emotional_support":50}';
begin
  perform pg_temp.check_that(not has_function_privilege('anon','public.claim_notification_deliveries(integer)','EXECUTE'),'anon cannot claim');
  perform pg_temp.check_that(not has_function_privilege('authenticated','public.prepare_notification_delivery(uuid,uuid)','EXECUTE'),'users cannot read push secrets');
  perform pg_temp.check_that(not has_table_privilege('authenticated','public.notification_jobs','SELECT'),'jobs are server-owned');
  perform pg_temp.check_that(not has_table_privilege('authenticated','public.user_push_subscriptions','INSERT'),'legacy direct registration is closed');
  perform pg_temp.check_that(public._notification_due_on('2026-03-08','02:30','America/Boise')='2026-03-08T09:00Z'::timestamptz,'DST gap chooses first valid minute');
  perform pg_temp.check_that(public._notification_due_on('2026-11-01','01:30','America/Boise')='2026-11-01T07:30Z'::timestamptz,'DST fold chooses first occurrence');
  perform pg_temp.check_that(public._notification_next_due('01:30','America/Boise','2026-11-01T08:00Z')='2026-11-02T08:30Z'::timestamptz,'fold never repeats reminder');

  -- Service setup touches only these newly generated Auth IDs and their periods.
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  insert into auth.users(id,email,raw_user_meta_data) values
    (dom,'notification-dom-'||dom||'@example.invalid','{"role":"dom"}'),
    (sub,'notification-sub-'||sub||'@example.invalid','{"role":"sub"}');
  update public.profiles set role='dom',timezone='America/Boise',dom_points=80,linked_partner_id=sub where id=dom;
  update public.profiles set role='sub',timezone='America/Boise',points=100,linked_partner_id=dom where id=sub;
  insert into public.relationship_periods default values returning id,relationship_session_id into period,generation;
  insert into public.relationship_period_members(relationship_id,user_id,role) values(period,dom,'dom') returning participant_id into dom_member;
  insert into public.relationship_period_members(relationship_id,user_id,role) values(period,sub,'sub') returning participant_id into sub_member;
  update public.identity_contexts set relationship_id=period where user_id in(dom,sub);
  conversation:=public._messages_ensure_conversation(period,dom_member,sub_member);
  update public.notification_configuration set delivery_enabled=true,vapid_key_id=key_id where singleton;
  select count(*) into initial_count from public.notification_jobs;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.register_my_push_device(device_a,ep_a,key_public,key_auth,key_id);
  perform public.register_my_push_device(device_b,ep_b,key_public,key_auth,key_id);
  perform pg_temp.check_that((public.get_my_push_device(device_a)->>'enabled')::boolean and
    (public.get_my_push_device(device_b)->>'enabled')::boolean,'two devices coexist');
  execute 'reset role';
  select verified_at into verified_a from public.user_push_subscriptions where user_id=sub and device_id=device_a;
  execute 'set local role authenticated';
  perform public.register_my_push_device(device_a,ep_a,key_public,key_auth,key_id);
  execute 'reset role';
  perform pg_temp.check_that((select verified_at=verified_a from public.user_push_subscriptions where user_id=sub and device_id=device_a),'exact registration retry preserves original opt-in time');
  execute 'set local role authenticated';
  begin perform public.register_my_push_device(gen_random_uuid(),'http://127.0.0.1/private',key_public,key_auth,key_id);
    raise exception 'unsafe endpoint accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.register_my_push_device(device_a,ep_a,key_public,key_auth,repeat('b',64));
    raise exception 'wrong key accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.claim_notification_deliveries(); raise exception 'client claimed work'; exception when insufficient_privilege then null; end;
  -- Diagnostics capture this one device's binding, not all devices or a target
  -- account. A retry returns its immutable receipt even after delivery is gated.
  test_receipt:=public.request_my_push_test(device_a,test_command);
  test_job:=(test_receipt->>'jobId')::uuid;
  perform pg_temp.check_that(public.request_my_push_test(device_a,test_command)=test_receipt,'test retry has a stable receipt');
  begin perform public.request_my_push_test(device_b,test_command); raise exception 'test command rebound'; exception when invalid_parameter_value then null; end;
  begin perform public.request_my_push_test(device_b,gen_random_uuid()); raise exception 'test rate limit bypassed'; exception when invalid_parameter_value then null; end;
  perform pg_temp.check_that(public.get_my_push_test(test_command)->>'status'='queued','test is queued, not delivered');
  execute 'reset role';
  update public.notification_configuration set delivery_enabled=false where singleton;
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.request_my_push_test(device_a,test_command)=test_receipt,'retry reconciles before changed gates');
  begin perform public.request_my_push_test(device_a,gen_random_uuid()); raise exception 'disabled delivery accepted'; exception when invalid_parameter_value then null; end;
  execute 'reset role';
  update public.notification_configuration set delivery_enabled=true where singleton;
  claims:=public.claim_notification_deliveries(20); claim:=claims->0;
  perform pg_temp.check_that(jsonb_array_length(claims)=1 and
    (select s.device_id=device_a from public.notification_deliveries d join public.user_push_subscriptions s on s.id=d.subscription_id where d.id=(claim->>'deliveryId')::uuid),'test targets exactly the requested device');
  ready:=public.prepare_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid);
  perform pg_temp.check_that(ready->'payload'->>'body'='This is your requested device notification test.' and
    ready->'payload'->>'url'='/notifications','fixed private diagnostic preview and route');
  perform public.finish_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid,'accepted',201);
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.get_my_push_test(test_command)->>'status'='acceptedByPushService','diagnostic reports service acceptance only');
  execute 'reset role';
  update public.notification_jobs set created_at=clock_timestamp()-interval '2 minutes' where id=test_job;
  update public.user_notification_preferences set preferences=jsonb_set(preferences,'{enabled}','false') where user_id=sub;
  execute 'set local role authenticated';
  begin perform public.request_my_push_test(device_a,gen_random_uuid()); raise exception 'master preference bypassed'; exception when invalid_parameter_value then null; end;
  execute 'reset role';
  update public.user_notification_preferences set preferences=jsonb_set(preferences,'{enabled}','true') where user_id=sub;
  execute 'set local role authenticated';
  command:=gen_random_uuid(); receipt:=public.request_my_push_test(device_a,command);
  perform public.revoke_my_push_device(device_a);
  perform public.register_my_push_device(device_a,ep_a,key_public,key_auth,key_id);
  execute 'reset role';
  perform pg_temp.check_that(public.claim_notification_deliveries(20)='[]'::jsonb,'new binding cannot receive an old test');
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.get_my_push_test(command)->>'status'='skipped','replaced binding status is skipped');
  execute 'reset role';
  update public.notification_jobs set created_at=clock_timestamp()-interval '2 minutes' where id=(receipt->>'jobId')::uuid;
  execute 'set local role authenticated';
  command:=gen_random_uuid(); receipt:=public.request_my_push_test(device_a,command);
  execute 'reset role';
  update public.notification_jobs set expires_at=clock_timestamp()-interval '1 second' where id in(test_job,(receipt->>'jobId')::uuid);
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.get_my_push_test(command)->>'status'='skipped','expired test is not queued forever when worker is stopped');
  perform pg_temp.check_that(public.get_my_push_test(test_command)->>'status'='acceptedByPushService','expiry does not erase earlier push-service acceptance');
  execute 'reset role';
  perform pg_temp.check_that(public.claim_notification_deliveries(20)='[]'::jsonb,'expired unexpanded test cannot be delivered');
  select count(*) into initial_count from public.notification_jobs;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform pg_temp.check_that(public.get_my_push_test(test_command) is null,'another account cannot inspect test receipts');
  begin perform public.request_my_push_test(device_a,gen_random_uuid()); raise exception 'another account device targeted'; exception when invalid_parameter_value then null; end;
  perform pg_temp.check_that(public.get_my_push_device(device_a)->'subscriptionId'='null'::jsonb,'another account cannot inspect a device');
  begin perform public.register_my_push_device(device_dom,ep_a,key_public,key_auth,key_id);
    raise exception 'endpoint stolen'; exception when insufficient_privilege then null; end;
  perform public.register_my_push_device(device_dom,ep_dom,key_public,key_auth,key_id);
  receipt:=public.send_message(period,generation,gen_random_uuid(),conversation,'Before device re-enabled');
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.revoke_my_push_device(device_a);
  perform public.register_my_push_device(device_a,ep_a,key_public,key_auth,key_id);
  execute 'reset role';
  perform pg_temp.check_that((select s.verified_at>j.created_at from public.user_push_subscriptions s,public.notification_jobs j
    where s.user_id=sub and s.device_id=device_a and j.source_id=(receipt->>'messageId')::uuid),'re-enabled old row gets a new opt-in time');
  claims:=public.claim_notification_deliveries(20); claim:=claims->0;
  perform pg_temp.check_that(jsonb_array_length(claims)=1 and
    (select s.device_id=device_b from public.notification_deliveries d join public.user_push_subscriptions s on s.id=d.subscription_id
      where d.id=(claim->>'deliveryId')::uuid),'only previously opted-in device receives an earlier event');
  perform public.finish_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid,'accepted',201);
  select count(*) into initial_count from public.notification_jobs;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  command:=gen_random_uuid();
  receipt:=public.send_message(period,generation,command,conversation,'Synthetic notification test');
  again:=public.send_message(period,generation,command,conversation,'Synthetic notification test');
  perform pg_temp.check_that(receipt=again,'message retry returns same receipt');
  execute 'reset role';
  perform pg_temp.check_that((select count(*) from public.notification_jobs)=initial_count+1,'native message creates exactly one job');
  perform pg_temp.check_that((select recipient_user_id=sub and actor_participant_id=dom_member from public.notification_jobs where source_id=(receipt->>'messageId')::uuid),'recipient derives from native message');
  claims:=public.claim_notification_deliveries(20);
  perform pg_temp.check_that(jsonb_array_length(claims)=2,'one job fans out to two devices');
  perform pg_temp.check_that(public.claim_notification_deliveries(20)='[]'::jsonb,'an active lease cannot be claimed twice');
  claim:=claims->0;
  ready:=public.prepare_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid);
  perform pg_temp.check_that(ready->>'status'='ready' and ready->'payload'->>'body'='You have a new message.' and
    not (ready->'payload' ? 'senderId') and not (ready->'payload' ? 'content'),'private server-derived preview');
  perform pg_temp.check_that(public.finish_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid,'accepted',201),'acceptance durably recorded');
  perform pg_temp.check_that(not public.finish_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid,'accepted',201),'duplicate completion does not repeat effect');
  claim:=claims->1;
  select s.device_id into command from public.user_push_subscriptions s join public.notification_deliveries d on d.subscription_id=s.id where d.id=(claim->>'deliveryId')::uuid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  execute 'set local role authenticated'; perform public.revoke_my_push_device(command); execute 'reset role';
  ready:=public.prepare_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid);
  perform pg_temp.check_that(ready->>'reason'='device_changed','revoking one device prevents its leased send');
  perform pg_temp.check_that((select count(*) from public.user_push_subscriptions where user_id=sub and enabled)=1,'other device remains enabled');

  -- A preference disabled at commit never becomes a backlog when enabled later.
  update public.user_notification_preferences set preferences=jsonb_set(preferences,'{types,messages}','false') where user_id=sub;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated'; receipt:=public.send_message(period,generation,gen_random_uuid(),conversation,'Muted synthetic message'); execute 'reset role';
  perform pg_temp.check_that((select state='skipped' and reason='preference' from public.notification_jobs where source_id=(receipt->>'messageId')::uuid),'disabled preference is terminal for that event');
  update public.user_notification_preferences set preferences=jsonb_set(preferences,'{types,messages}','true') where user_id=sub;

  execute 'set local role authenticated'; receipt:=public.send_message(period,generation,gen_random_uuid(),conversation,'Before connection change'); execute 'reset role';
  claims:=public.claim_notification_deliveries(20); claim:=claims->0;
  perform pg_temp.check_that(jsonb_array_length(claims)=1,'remaining device receives next event');
  update public.relationship_periods set relationship_session_id=gen_random_uuid() where id=period returning relationship_session_id into generation;
  ready:=public.prepare_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid);
  perform pg_temp.check_that(ready->>'reason'='connection_changed','same-period Continue generation cancels old delivery');

  -- New wellbeing snapshots, not mutable legacy rows, are event sources.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  execute 'set local role authenticated'; command:=gen_random_uuid();
  receipt:=public.save_wellbeing_checkin(command,period,generation,'America/Boise',metrics,'2026-01-01T00:00Z');
  again:=public.save_wellbeing_checkin(command,period,generation,'America/Boise',metrics,'2026-01-01T00:00Z');
  execute 'reset role'; wellbeing:=(receipt->>'id')::uuid;
  perform pg_temp.check_that(receipt=again and (select count(*) from public.notification_jobs where source_kind='wellbeing' and source_id=wellbeing)=1,'check-in retry creates one job');
  claims:=public.claim_notification_deliveries(20); claim:=claims->0; previous_claim:=claim;
  perform pg_temp.check_that(jsonb_array_length(claims)=1,'wellbeing recipient is the partner');
  perform public.prepare_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid);
  perform public.finish_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid,'retryable',503);
  perform pg_temp.check_that(public.claim_notification_deliveries(20)='[]'::jsonb,'retry is delayed');
  update public.notification_deliveries set available_at=clock_timestamp()-interval '1 second' where id=(claim->>'deliveryId')::uuid;
  claims:=public.claim_notification_deliveries(20); claim:=claims->0;
  perform pg_temp.check_that(claim->>'deliveryId'=previous_claim->>'deliveryId' and claim->>'leaseToken'<>previous_claim->>'leaseToken','retry preserves delivery identity and replaces lease');
  perform pg_temp.check_that(not public.finish_notification_delivery((previous_claim->>'deliveryId')::uuid,(previous_claim->>'leaseToken')::uuid,'accepted',201),'old worker cannot finish a new lease');
  perform public.finish_notification_delivery((claim->>'deliveryId')::uuid,(claim->>'leaseToken')::uuid,'invalid_endpoint',410);
  perform pg_temp.check_that(not (select enabled from public.user_push_subscriptions where user_id=dom and device_id=device_dom),'invalid endpoint disables its device only');

  -- Real command receipt producer, including a refund credited to someone other
  -- than the actor deleting the reward. No action replay creates another job.
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  insert into public.rewards(user_id,relationship_id,title,cost,supply,is_dom_reward)
    values(dom,period,'Synthetic refundable reward',20,5,false) returning id into reward;
  perform public.activate_action_accounting(period);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  execute 'set local role authenticated'; command:=gen_random_uuid();
  receipt:=public.execute_reward_command(p_command_id=>command,p_expected_relationship_id=>period,p_action=>'reward_buy',p_reward_id=>reward,p_expected_cost=>20,p_expected_relationship_session_id=>generation);
  again:=public.execute_reward_command(p_command_id=>command,p_expected_relationship_id=>period,p_action=>'reward_buy',p_reward_id=>reward,p_expected_cost=>20,p_expected_relationship_session_id=>generation);
  execute 'reset role';
  perform pg_temp.check_that(jsonb_typeof(receipt->'eventIds')='array' and jsonb_array_length(receipt->'eventIds')=1,
    'purchase receipt identifies exactly one committed event');
  event:=(receipt->'eventIds'->>0)::uuid;
  perform pg_temp.check_that(receipt=again and (select count(*) from public.notification_jobs where source_id=event)=1,'purchase replay creates no duplicate');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',dom,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  receipt:=public.execute_reward_command(p_command_id=>gen_random_uuid(),p_expected_relationship_id=>period,p_action=>'reward_delete',p_reward_id=>reward,p_expected_relationship_session_id=>generation);
  execute 'reset role';
  perform pg_temp.check_that(jsonb_typeof(receipt->'eventIds')='array' and jsonb_array_length(receipt->'eventIds')=1,
    'reward deletion receipt identifies exactly one committed event');
  event:=(receipt->'eventIds'->>0)::uuid;
  perform pg_temp.check_that((select recipient_user_id=sub and recipient_participant_id=sub_member and actor_participant_id=dom_member
    from public.notification_jobs where source_id=event and notification_type='rewardRefunded'),'refund alerts the actual credited owner');

  -- Personal daily reminder: saved recipient timezone, disable persists, one
  -- local-date occurrence after restart; last_sent requires actual acceptance.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sub,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  receipt:=public.save_my_wellness_reminder(true,'00:00'); reminder:=(receipt->>'id')::uuid;
  perform pg_temp.check_that(receipt->>'timezone'='America/Boise','reminder uses saved recipient timezone');
  receipt:=public.save_my_wellness_reminder(false,'00:00');
  perform pg_temp.check_that(receipt->>'enabled'='false' and public.get_my_wellness_reminder()->>'enabled'='false','disable survives reload');
  perform public.save_my_wellness_reminder(true,'00:00'); execute 'reset role';
  update public.wellness_reminders set next_due_at=clock_timestamp()-interval '2 days' where id=reminder;
  perform public.enqueue_due_wellness_reminders(); perform public.enqueue_due_wellness_reminders();
  perform pg_temp.check_that((select count(*) from public.notification_jobs where source_kind='reminder' and source_id=reminder)=1,'restart only queues today once');
  perform pg_temp.check_that((select last_sent is null from public.wellness_reminders where id=reminder),'enqueue does not pretend to send');
  perform pg_temp.check_that((select recipient_user_id=sub and relationship_id is null from public.notification_jobs where source_kind='reminder' and source_id=reminder),'reminder is private to its owner');
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  update public.profiles set timezone='Pacific/Honolulu' where id=sub;
  perform pg_temp.check_that((select public._notification_skip_reason(j)='reminder_changed' from public.notification_jobs j where source_kind='reminder' and source_id=reminder),'timezone change cancels stale reminder');
  perform pg_temp.check_that(not exists(select 1 from notification_original_reminders r where r.existing_job_count<>
    (select count(*) from public.notification_jobs j where j.source_kind='reminder' and j.source_id=r.id)),
    'scheduler never enqueues an original reminder');
  raise notice 'Notification SQL checks passed; all synthetic writes will roll back.';
end $$;
rollback;
-- Read-only evidence after the required rollback: every original reminder field,
-- including enabled, timestamps and schedule metadata, must match the snapshot.
select md5(coalesce(jsonb_agg(to_jsonb(w) order by w.id),'[]'::jsonb)::text)=:'notification_baseline_reminders_hash'
  as reminders_restored from public.wellness_reminders w
\gset notification_verification_
\if :notification_verification_reminders_restored
  \echo Original reminder rows restored exactly after rollback.
\else
  do $$ begin raise exception 'ORIGINAL_REMINDER_ROLLBACK_VERIFICATION_FAILED'; end $$;
\endif
