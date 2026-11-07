-- PREPARED ONLY. Requires 0900/1000. Does not enable delivery, schedule jobs,
-- activate accounts, replay history, or call any external service.
begin;

create table public.notification_configuration (
  singleton boolean primary key default true check(singleton),
  delivery_enabled boolean not null default false,
  vapid_key_id text check(vapid_key_id ~ '^[a-f0-9]{64}$')
);
insert into public.notification_configuration default values;

-- Preserve existing endpoints as unverified historical registrations. They are
-- never sent to until this browser registers against the configured key.
alter table public.user_push_subscriptions drop constraint unique_user_subscription;
alter table public.user_push_subscriptions
  add column device_id uuid,
  add column vapid_key_id text,
  add column verified_at timestamptz,
  add column binding_version uuid not null default pg_catalog.gen_random_uuid(),
  add column enabled boolean not null default false;
create unique index push_device_owner on public.user_push_subscriptions(user_id,device_id) where device_id is not null;
-- Old data can contain the same endpoint for two accounts. Preserve it, but
-- permit only one verified active binding rather than reassigning ownership.
create unique index push_active_endpoint on public.user_push_subscriptions(endpoint) where enabled;

create table public.notification_jobs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  source_kind text not null check(source_kind in ('action','message','wellbeing','reminder','diagnostic')),
  source_id uuid not null,
  occurrence text not null default '',
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_participant_id uuid references public.relationship_period_members(participant_id),
  actor_participant_id uuid references public.relationship_period_members(participant_id),
  relationship_id uuid references public.relationship_periods(id),
  relationship_session_id uuid,
  notification_type text not null check(notification_type in ('ruleBroken','taskCompleted','rewardPurchased',
    'rewardRedeemed','rewardRefunded','punishmentPerformed','wellnessUpdated','wellnessCheckin','messages','deviceTest')),
  reminder_version uuid,
  target_device_id uuid,
  target_binding_version uuid,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp()+interval '1 day'),
  state text not null default 'pending' check(state in ('pending','expanded','skipped')),
  reason text,
  unique(source_kind,source_id,occurrence,recipient_user_id,notification_type),
  check((source_kind in ('reminder','diagnostic') and relationship_id is null and relationship_session_id is null)
    or (source_kind not in ('reminder','diagnostic') and relationship_id is not null and relationship_session_id is not null)),
  check((source_kind='diagnostic' and notification_type='deviceTest' and target_device_id is not null and target_binding_version is not null)
    or (source_kind<>'diagnostic' and notification_type<>'deviceTest' and target_device_id is null and target_binding_version is null))
);
create index notification_diagnostic_rate on public.notification_jobs(recipient_user_id,created_at) where source_kind='diagnostic';
create index notification_jobs_pending on public.notification_jobs(created_at,id) where state='pending';
create table public.notification_deliveries (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  subscription_id uuid not null references public.user_push_subscriptions(id) on delete cascade,
  binding_version uuid not null,
  state text not null default 'pending' check(state in ('pending','leased','accepted','skipped','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default clock_timestamp(),
  lease_token uuid,
  lease_until timestamptz,
  reason text,
  last_http_status integer,
  accepted_at timestamptz,
  unique(job_id,subscription_id)
);
create index notification_delivery_due on public.notification_deliveries(available_at,id) where state in ('pending','leased');
alter table public.wellness_reminders
  add column next_due_at timestamptz,
  add column schedule_version uuid not null default pg_catalog.gen_random_uuid();

do $$ declare t text; p record; begin
  foreach t in array array['notification_configuration','notification_jobs','notification_deliveries',
    'user_push_subscriptions','wellness_reminders'] loop
    execute format('alter table public.%I enable row level security',t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;

create function public._notification_valid_endpoint(p_endpoint text) returns boolean
language sql immutable set search_path='' as $$
  -- No arbitrary fetch destination, credentials, port, fragment, whitespace,
  -- redirect target, IP address, or lookalike suffix. Supported browser services.
  select p_endpoint is not null and length(p_endpoint) between 30 and 2048 and
    p_endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com)/[A-Za-z0-9_~./?=&%+-]+$';
$$;
create function public._notification_valid_key(p_key text,p_length integer,p_public boolean) returns boolean
language plpgsql immutable set search_path='' as $$
declare decoded bytea;
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9_-]+$' or length(p_key)<>(case when p_public then 87 else 22 end) then return false; end if;
  decoded:=decode(translate(p_key,'-_','+/')||case when p_public then '=' else '==' end,'base64');
  return octet_length(decoded)=p_length and (not p_public or get_byte(decoded,0)=4) and
    rtrim(translate(replace(encode(decoded,'base64'),chr(10),''),'+/','-_'),'=')=p_key;
exception when others then return false;
end $$;
create function public.get_my_push_device(p_device_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.user_push_subscriptions%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into s from public.user_push_subscriptions where user_id=auth.uid() and device_id=p_device_id;
  return jsonb_build_object('deviceId',p_device_id,'subscriptionId',s.id,'enabled',coalesce(s.enabled,false),
    'vapidKeyId',s.vapid_key_id);
end $$;
create function public.register_my_push_device(p_device_id uuid,p_endpoint text,p_p256dh text,p_auth text,p_vapid_key_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare configured text; s public.user_push_subscriptions%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_device_id is null or not public._notification_valid_endpoint(p_endpoint) or
    not public._notification_valid_key(p_p256dh,65,true) or not public._notification_valid_key(p_auth,16,false) then
    raise exception using errcode='22023',message='INVALID_PUSH_SUBSCRIPTION'; end if;
  select vapid_key_id into configured from public.notification_configuration where singleton for share;
  if configured is null or p_vapid_key_id is distinct from configured then
    raise exception using errcode='22023',message='PUSH_KEY_CHANGED'; end if;
  -- Serialize endpoint and device registrations. Another account's row is never
  -- revealed or stolen, including disabled historical registrations.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('push:'||p_endpoint,0));
  if exists(select 1 from public.user_push_subscriptions where endpoint=p_endpoint and user_id<>auth.uid()) then
    raise exception using errcode='42501',message='PUSH_DEVICE_REQUIRES_RESUBSCRIBE'; end if;
  select * into s from public.user_push_subscriptions where user_id=auth.uid() and device_id=p_device_id for update;
  if found and s.endpoint=p_endpoint and s.p256dh=p_p256dh and s.auth=p_auth and s.vapid_key_id=p_vapid_key_id and s.enabled then
    return public.get_my_push_device(p_device_id); end if;
  -- A browser may have an old unverified row without device_id. Adopt only its
  -- own row; do not delete other devices or reset their status.
  if s.id is null then
    select * into s from public.user_push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint for update;
  end if;
  if s.id is null then
    insert into public.user_push_subscriptions(user_id,device_id,endpoint,p256dh,auth,vapid_key_id,verified_at,enabled)
      values(auth.uid(),p_device_id,p_endpoint,p_p256dh,p_auth,p_vapid_key_id,clock_timestamp(),true);
  else
    update public.user_push_subscriptions set device_id=p_device_id,endpoint=p_endpoint,p256dh=p_p256dh,auth=p_auth,
      vapid_key_id=p_vapid_key_id,verified_at=clock_timestamp(),enabled=true,binding_version=pg_catalog.gen_random_uuid() where id=s.id;
  end if;
  return public.get_my_push_device(p_device_id);
end $$;
create function public.revoke_my_push_device(p_device_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  update public.user_push_subscriptions set enabled=false,binding_version=pg_catalog.gen_random_uuid()
    where user_id=auth.uid() and device_id=p_device_id;
end $$;

create function public._notification_preference(p_user uuid,p_type text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare p jsonb; v jsonb; k text;
begin
  select preferences into p from public.user_notification_preferences where user_id=p_user;
  if not found then return true; end if; -- Same legacy missing-row default as the accepted UI.
  if jsonb_typeof(p) is distinct from 'object' or (p->'types' is not null and p->'types'<>'null'::jsonb and jsonb_typeof(p->'types')<>'object') then return false; end if;
  v:=p->'enabled'; if v is not null and v<>'null'::jsonb and jsonb_typeof(v)<>'boolean' then return false; end if;
  if v='false'::jsonb then return false; end if;
  foreach k in array array['ruleBroken','taskCompleted','rewardPurchased','rewardRedeemed','rewardRefunded',
    'punishmentPerformed','wellnessUpdated','wellnessCheckin','messages'] loop
    v:=p->'types'->k;
    if v is not null and v<>'null'::jsonb and jsonb_typeof(v)<>'boolean' then return false; end if;
  end loop;
  return coalesce(p->'types'->p_type,'true'::jsonb) is distinct from 'false'::jsonb;
end $$;

-- Explicit current-device diagnostics are the only client-produced jobs. There
-- is no recipient/body/URL input. The immutable receipt is separate from status.
create function public.request_my_push_test(p_device_id uuid,p_command_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.notification_jobs%rowtype; s public.user_push_subscriptions%rowtype; configured text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_device_id is null or p_command_id is null then raise exception using errcode='22023',message='INVALID_PUSH_TEST'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('push-test:'||auth.uid()::text,0));
  select * into j from public.notification_jobs where source_kind='diagnostic' and source_id=p_command_id and recipient_user_id=auth.uid();
  if j.id is not null then
    if j.target_device_id<>p_device_id then raise exception using errcode='22023',message='PUSH_TEST_COMMAND_REUSED'; end if;
    return jsonb_build_object('commandId',p_command_id,'deviceId',j.target_device_id,'jobId',j.id);
  end if;
  select vapid_key_id into configured from public.notification_configuration where singleton and delivery_enabled for share;
  if configured is null then raise exception using errcode='22023',message='PUSH_DELIVERY_DISABLED'; end if;
  if not public._notification_preference(auth.uid(),null) then raise exception using errcode='22023',message='PUSH_PREFERENCES_DISABLED'; end if;
  select * into s from public.user_push_subscriptions where user_id=auth.uid() and device_id=p_device_id and enabled and vapid_key_id=configured for share;
  if s.id is null then raise exception using errcode='22023',message='PUSH_DEVICE_NOT_ENABLED'; end if;
  if exists(select 1 from public.notification_jobs where source_kind='diagnostic' and recipient_user_id=auth.uid()
    and created_at>clock_timestamp()-interval '1 minute') then raise exception using errcode='22023',message='PUSH_TEST_RATE_LIMITED'; end if;
  insert into public.notification_jobs(source_kind,source_id,recipient_user_id,notification_type,target_device_id,target_binding_version,expires_at)
    values('diagnostic',p_command_id,auth.uid(),'deviceTest',p_device_id,s.binding_version,clock_timestamp()+interval '5 minutes') returning * into j;
  return jsonb_build_object('commandId',p_command_id,'deviceId',p_device_id,'jobId',j.id);
end $$;
create function public.get_my_push_test(p_command_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.notification_jobs%rowtype; d public.notification_deliveries%rowtype; status text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into j from public.notification_jobs where source_kind='diagnostic' and source_id=p_command_id and recipient_user_id=auth.uid();
  if j.id is null then return null; end if;
  select * into d from public.notification_deliveries where job_id=j.id;
  status:=case when d.state='accepted' then 'acceptedByPushService' when d.state='failed' then 'failed'
    when d.state='skipped' or j.state='skipped' or j.expires_at<=clock_timestamp() then 'skipped' else 'queued' end;
  return jsonb_build_object('commandId',p_command_id,'deviceId',j.target_device_id,'jobId',j.id,'status',status);
end $$;

-- Minute-precision settings. Enumerate real instants in the local day: a fold
-- chooses its first occurrence; a gap chooses the first valid minute after it.
create function public._notification_due_on(p_day date,p_time time,p_timezone text) returns timestamptz
language sql stable set search_path='' as $$
  select min(t) from pg_catalog.generate_series(p_day::timestamp at time zone p_timezone,
    ((p_day+1)::timestamp at time zone p_timezone) - interval '1 minute',interval '1 minute') t
  where (t at time zone p_timezone)::date=p_day and (t at time zone p_timezone)::time>=p_time;
$$;
create function public._notification_next_due(p_time time,p_timezone text,p_after timestamptz) returns timestamptz
language sql stable set search_path='' as $$
  select min(public._notification_due_on((p_after at time zone p_timezone)::date+d,p_time,p_timezone))
  from pg_catalog.generate_series(0,3) d
  where public._notification_due_on((p_after at time zone p_timezone)::date+d,p_time,p_timezone)>p_after;
$$;
create function public.get_my_wellness_reminder() returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.wellness_reminders%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into r from public.wellness_reminders where user_id=auth.uid();
  if not found then return null; end if;
  return to_jsonb(r)-'schedule_version';
end $$;
create function public.save_my_wellness_reminder(p_enabled boolean,p_reminder_time time) returns jsonb
language plpgsql security definer set search_path='' as $$
declare tz text; r public.wellness_reminders%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_enabled is null or p_reminder_time is null or extract(second from p_reminder_time)<>0 or p_reminder_time>='24:00'::time then
    raise exception using errcode='22023',message='INVALID_REMINDER_TIME'; end if;
  select timezone into tz from public.profiles where id=auth.uid() for update;
  if p_enabled and tz is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
  select * into r from public.wellness_reminders where user_id=auth.uid() for update;
  tz:=coalesce(tz,r.timezone,'UTC');
  if r.id is not null and r.enabled=p_enabled and r.reminder_time=p_reminder_time and r.timezone=tz then
    return public.get_my_wellness_reminder(); end if;
  insert into public.wellness_reminders(user_id,enabled,reminder_time,timezone,next_due_at)
    values(auth.uid(),p_enabled,p_reminder_time,tz,case when p_enabled then public._notification_next_due(p_reminder_time,tz,clock_timestamp()) end)
  on conflict(user_id) do update set enabled=excluded.enabled,reminder_time=excluded.reminder_time,timezone=excluded.timezone,
    next_due_at=excluded.next_due_at,schedule_version=pg_catalog.gen_random_uuid();
  return public.get_my_wellness_reminder();
end $$;
create function public._notification_timezone_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if NEW.timezone is distinct from OLD.timezone then
    update public.wellness_reminders set timezone=coalesce(NEW.timezone,timezone),schedule_version=pg_catalog.gen_random_uuid(),
      next_due_at=case when enabled and NEW.timezone is not null then public._notification_next_due(reminder_time,NEW.timezone,clock_timestamp()) end
      where user_id=NEW.id;
  end if;
  return NEW;
end $$;
create trigger notification_saved_timezone after update of timezone on public.profiles for each row execute function public._notification_timezone_changed();

create function public._notification_enqueue(p_kind text,p_source uuid,p_recipient uuid,p_actor uuid,p_period uuid,p_session uuid,p_type text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
  select user_id into u from public.relationship_period_members where participant_id=p_recipient and relationship_id=p_period;
  if u is null or p_session is null then return; end if;
  insert into public.notification_jobs(source_kind,source_id,recipient_user_id,recipient_participant_id,actor_participant_id,
    relationship_id,relationship_session_id,notification_type,state,reason)
  values(p_kind,p_source,u,p_recipient,p_actor,p_period,p_session,p_type,
    case when public._notification_preference(u,p_type) then 'pending' else 'skipped' end,
    case when not public._notification_preference(u,p_type) then 'preference' end) on conflict do nothing;
end $$;
create function public._notification_action_committed() returns trigger
language plpgsql security definer set search_path='' as $$
declare e public.action_events%rowtype; f record; peer uuid; typ text;
begin
  select * into e from public.action_events where command_id=NEW.command_id and relationship_id=NEW.relationship_id and provenance='command';
  if not found or NEW.relationship_session_id is null then return NEW; end if;
  -- Refund recipient/amount are authoritative outbox facts, never the actor's balance.
  for f in select * from public.action_feedback_outbox where event_id=e.id and kind='points_refunded'
    and (payload->>'points')::numeric>0 loop
    perform public._notification_enqueue('action',e.id,f.recipient_participant_id,e.actor_participant_id,e.relationship_id,NEW.relationship_session_id,'rewardRefunded');
  end loop;
  typ:=case e.kind when 'task_completed' then 'taskCompleted' when 'rule_violated' then 'ruleBroken'
    when 'punishment_applied' then 'punishmentPerformed' when 'reward_purchased' then 'rewardPurchased'
    when 'reward_gifted' then 'rewardPurchased' when 'reward_redeemed' then 'rewardRedeemed' end;
  if typ is not null then
    for peer in select participant_id from public.relationship_period_members
      where relationship_id=e.relationship_id and participant_id<>e.actor_participant_id and user_id is not null loop
      perform public._notification_enqueue('action',e.id,peer,e.actor_participant_id,e.relationship_id,NEW.relationship_session_id,typ);
    end loop;
  end if;
  return NEW;
end $$;
create trigger notification_action_committed after insert on public.action_command_receipts for each row execute function public._notification_action_committed();
create function public._notification_message_committed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if NEW.provenance='native' then perform public._notification_enqueue('message',NEW.id,NEW.receiver_participant_id,
    NEW.sender_participant_id,NEW.relationship_id,NEW.accepted_relationship_session_id,'messages'); end if;
  return NEW;
end $$;
create trigger notification_message_committed after insert on public.messages for each row execute function public._notification_message_committed();
create function public._notification_wellbeing_committed() returns trigger
language plpgsql security definer set search_path='' as $$
declare peer uuid;
begin
  if NEW.submission_id is not null then
    for peer in select participant_id from public.relationship_period_members where relationship_id=NEW.relationship_id
      and participant_id<>NEW.participant_id and user_id is not null loop
      perform public._notification_enqueue('wellbeing',NEW.id,peer,NEW.participant_id,NEW.relationship_id,NEW.relationship_session_id,'wellnessUpdated');
    end loop;
  end if;
  return NEW;
end $$;
create trigger notification_wellbeing_committed after insert on public.wellbeing_snapshots for each row execute function public._notification_wellbeing_committed();

create function public.enqueue_due_wellness_reminders() returns integer
language plpgsql security definer set search_path='' as $$
declare r record; today date; due timestamptz; at_time timestamptz:=clock_timestamp(); n integer:=0;
begin
  -- Service caller only; no caller-chosen user, timezone or retrospective clock.
  for r in select w.*,p.timezone saved_timezone from public.wellness_reminders w join public.profiles p on p.id=w.user_id
    where w.enabled and p.timezone is not null and (w.next_due_at is null or w.next_due_at<=at_time)
    order by w.next_due_at nulls first,w.id for update of w skip locked limit 100 loop
    today:=(at_time at time zone r.saved_timezone)::date;
    due:=public._notification_due_on(today,r.reminder_time,r.saved_timezone);
    -- A scheduler restart may catch up today, never a backlog of earlier days.
    if due<=at_time then
      insert into public.notification_jobs(source_kind,source_id,occurrence,recipient_user_id,notification_type,reminder_version,expires_at,state,reason)
      values('reminder',r.id,today::text,r.user_id,'wellnessCheckin',r.schedule_version,
        (today+1)::timestamp at time zone r.saved_timezone,
        case when public._notification_preference(r.user_id,'wellnessCheckin') then 'pending' else 'skipped' end,
        case when not public._notification_preference(r.user_id,'wellnessCheckin') then 'preference' end)
      on conflict do nothing;
      if found then n:=n+1; end if;
    end if;
    update public.wellness_reminders set timezone=r.saved_timezone,
      next_due_at=public._notification_next_due(r.reminder_time,r.saved_timezone,at_time) where id=r.id;
  end loop;
  return n;
end $$;

create function public._notification_skip_reason(j public.notification_jobs) returns text
language plpgsql stable security definer set search_path='' as $$
begin
  if j.expires_at<=clock_timestamp() then return 'expired'; end if;
  if not public._notification_preference(j.recipient_user_id,case when j.source_kind='diagnostic' then null else j.notification_type end) then return 'preference'; end if;
  if j.source_kind='diagnostic' then
    if not exists(select 1 from public.user_push_subscriptions s where s.user_id=j.recipient_user_id
      and s.device_id=j.target_device_id and s.binding_version=j.target_binding_version and s.enabled) then return 'device_changed'; end if;
  elsif j.source_kind='reminder' then
    if not exists(select 1 from public.wellness_reminders r join public.profiles p on p.id=r.user_id
      where r.id=j.source_id and r.user_id=j.recipient_user_id and r.enabled and r.schedule_version=j.reminder_version
      and p.timezone=r.timezone and (clock_timestamp() at time zone p.timezone)::date::text=j.occurrence) then return 'reminder_changed'; end if;
  else
    if not exists(select 1 from public.relationship_periods r join public.identity_contexts c on c.relationship_id=r.id
      where r.id=j.relationship_id and r.status='active' and r.relationship_session_id=j.relationship_session_id and c.user_id=j.recipient_user_id)
      or not exists(select 1 from public.relationship_period_members m join public.identity_contexts c
        on c.user_id=m.user_id and c.relationship_id=m.relationship_id
        where m.participant_id=j.actor_participant_id and m.relationship_id=j.relationship_id) then return 'connection_changed'; end if;
    if j.source_kind='action' and j.notification_type<>'rewardRefunded' and exists(select 1 from public.action_events where reverses_event_id=j.source_id) then return 'action_undone'; end if;
    if j.source_kind='message' and not exists(select 1 from public.messages where id=j.source_id and read_at is null) then return 'message_read'; end if;
  end if;
  return null;
end $$;

create function public.claim_notification_deliveries(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.notification_jobs%rowtype; d public.notification_deliveries%rowtype; v_reason text; result jsonb:='[]';
begin
  if p_limit is null or p_limit<1 or p_limit>50 then raise exception using errcode='22023',message='INVALID_NOTIFICATION_BATCH'; end if;
  if not exists(select 1 from public.notification_configuration where delivery_enabled and vapid_key_id is not null) then return result; end if;
  perform public._identity_lock();
  for j in select * from public.notification_jobs where state='pending' order by created_at,id for update skip locked limit p_limit loop
    v_reason:=public._notification_skip_reason(j);
    if v_reason is null then
      insert into public.notification_deliveries(job_id,subscription_id,binding_version)
        select j.id,s.id,s.binding_version from public.user_push_subscriptions s,public.notification_configuration c
        -- A renewed opt-in does not receive work from before that registration,
        -- even when it reuses an old subscription row or endpoint.
        where s.user_id=j.recipient_user_id and s.enabled and s.vapid_key_id=c.vapid_key_id and s.verified_at<=j.created_at
        and (j.source_kind<>'diagnostic' or (s.device_id=j.target_device_id and s.binding_version=j.target_binding_version))
        on conflict do nothing;
      if not exists(select 1 from public.notification_deliveries where job_id=j.id) then v_reason:='no_device'; end if;
    end if;
    update public.notification_jobs set state=case when v_reason is null then 'expanded' else 'skipped' end,reason=v_reason where id=j.id;
  end loop;
  for d in select * from public.notification_deliveries where
    (state='pending' and available_at<=clock_timestamp()) or (state='leased' and lease_until<clock_timestamp())
    order by available_at,id for update skip locked limit p_limit loop
    if d.attempts>=5 then update public.notification_deliveries set state='failed',reason='retry_exhausted' where id=d.id; continue; end if;
    update public.notification_deliveries set state='leased',attempts=attempts+1,lease_token=pg_catalog.gen_random_uuid(),
      lease_until=clock_timestamp()+interval '2 minutes' where id=d.id returning * into d;
    result:=result||jsonb_build_array(jsonb_build_object('deliveryId',d.id,'leaseToken',d.lease_token));
  end loop;
  return result;
end $$;
create function public.prepare_notification_delivery(p_delivery_id uuid,p_lease_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.notification_deliveries%rowtype; j public.notification_jobs%rowtype; s public.user_push_subscriptions%rowtype;
  v_reason text; target text;
begin
  perform public._identity_lock();
  select * into d from public.notification_deliveries where id=p_delivery_id for update;
  if d.id is null or d.state<>'leased' or d.lease_token is distinct from p_lease_token or d.lease_until<=clock_timestamp() then
    raise exception using errcode='22023',message='STALE_DELIVERY_LEASE'; end if;
  select * into strict j from public.notification_jobs where id=d.job_id;
  select * into strict s from public.user_push_subscriptions where id=d.subscription_id;
  v_reason:=public._notification_skip_reason(j);
  if v_reason is null and (not s.enabled or s.user_id<>j.recipient_user_id or s.binding_version<>d.binding_version
    or not public._notification_valid_endpoint(s.endpoint)) then v_reason:='device_changed'; end if;
  if v_reason is null and not exists(select 1 from public.notification_configuration where delivery_enabled and vapid_key_id=s.vapid_key_id) then v_reason:='delivery_disabled'; end if;
  if v_reason is not null then
    update public.notification_deliveries set state='skipped',reason=v_reason,lease_until=null where id=d.id;
    return jsonb_build_object('status','skipped','reason',v_reason);
  end if;
  target:=case j.notification_type when 'deviceTest' then '/notifications' when 'messages' then '/messages' when 'wellnessCheckin' then '/wellbeing'
    when 'wellnessUpdated' then '/wellbeing' when 'taskCompleted' then '/tasks' when 'ruleBroken' then '/rules'
    when 'punishmentPerformed' then '/punishments' else '/rewards' end;
  return jsonb_build_object('status','ready','subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth)),
    'vapidKeyId',s.vapid_key_id,'ttl',greatest(1,least(3600,extract(epoch from j.expires_at-clock_timestamp())::integer)),
    'payload',jsonb_build_object('version',1,'notificationId',d.id,'title','Navy Slate Navigator',
      'body',case when j.notification_type='deviceTest' then 'This is your requested device notification test.' when j.notification_type='messages' then 'You have a new message.'
        when j.notification_type='wellnessCheckin' then 'It is time for your wellbeing check-in.' else 'Your activity has an update.' end,
      'url',target));
end $$;
create function public.finish_notification_delivery(p_delivery_id uuid,p_lease_token uuid,p_outcome text,p_http_status integer default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare d public.notification_deliveries%rowtype; j public.notification_jobs%rowtype;
begin
  if p_outcome is null or p_outcome not in ('accepted','invalid_endpoint','retryable','permanent_failure') or
    (p_http_status is not null and p_http_status not between 100 and 599) or
    (p_outcome='accepted' and (p_http_status is null or p_http_status not between 200 and 299)) or
    (p_outcome='invalid_endpoint' and (p_http_status is null or p_http_status not in (404,410))) then
    raise exception using errcode='22023',message='INVALID_DELIVERY_OUTCOME'; end if;
  select * into d from public.notification_deliveries where id=p_delivery_id for update;
  if d.id is null or d.state<>'leased' or d.lease_token is distinct from p_lease_token or d.lease_until<=clock_timestamp() then return false; end if;
  select * into strict j from public.notification_jobs where id=d.job_id;
  update public.notification_deliveries set state=case p_outcome when 'accepted' then 'accepted' when 'retryable' then
      case when attempts<5 and j.expires_at>clock_timestamp() then 'pending' else 'failed' end else 'failed' end,
    reason=p_outcome,last_http_status=p_http_status,lease_until=null,
    available_at=clock_timestamp()+least(3600,60*power(2,attempts-1))::integer*interval '1 second',
    accepted_at=case when p_outcome='accepted' then clock_timestamp() end where id=d.id;
  if p_outcome='invalid_endpoint' then
    update public.user_push_subscriptions set enabled=false where id=d.subscription_id and binding_version=d.binding_version;
  elsif p_outcome='accepted' and j.source_kind='reminder' then
    -- Push-service acceptance, not proof that a device displayed it.
    update public.wellness_reminders set last_sent=clock_timestamp() where id=j.source_id and schedule_version=j.reminder_version;
  end if;
  return true;
end $$;

-- All helper and worker functions are closed by default. Only the bounded own-device test can enqueue; clients cannot
-- claim, select another user's endpoint, or acknowledge a push-service result.
do $$ declare p record; begin
  for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and
    (proname like '\_notification\_%' escape '\' or proname in ('get_my_push_device','register_my_push_device','revoke_my_push_device',
      'get_my_wellness_reminder','save_my_wellness_reminder','request_my_push_test','get_my_push_test','enqueue_due_wellness_reminders','claim_notification_deliveries',
      'prepare_notification_delivery','finish_notification_delivery')) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
  end loop;
end $$;
grant execute on function public.get_my_push_device(uuid),public.register_my_push_device(uuid,text,text,text,text),
  public.revoke_my_push_device(uuid),public.request_my_push_test(uuid,uuid),public.get_my_push_test(uuid),public.get_my_wellness_reminder(),public.save_my_wellness_reminder(boolean,time) to authenticated;
grant execute on function public.enqueue_due_wellness_reminders(),public.claim_notification_deliveries(integer),
  public.prepare_notification_delivery(uuid,uuid),public.finish_notification_delivery(uuid,uuid,text,integer) to service_role;
-- Obsolete caller-supplied sender/recipient authorization must not remain usable
-- by the retired sender, even if its old function code is still deployed.
revoke all on function public.can_notify_user(uuid,uuid) from public,anon,authenticated,service_role;
comment on table public.notification_deliveries is 'accepted means push-service acceptance only; network ambiguity may retry with the same notification ID. No device display claim.';
notify pgrst,'reload schema';
commit;
