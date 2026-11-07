-- Prepared only. No account activation, scheduler, production deletion or delivery.
-- Authenticated users cannot finalize this operation or supply Storage targets.
begin;

create table public.account_deletion_jobs (
  id uuid primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  expected_period_id uuid not null,
  expected_session_id uuid not null,
  affected_period_ids uuid[] not null,
  recovery_hash text not null check(recovery_hash ~ '^[a-f0-9]{64}$'),
  phase text not null default 'storage' check(phase in ('storage','account','complete')),
  retry_required boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  prepared_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  check((phase='complete')=(completed_at is not null))
);
create index unfinished_account_deletions on public.account_deletion_jobs using gin(affected_period_ids) where phase<>'complete';
create table public.account_deletion_objects (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  job_id uuid not null references public.account_deletion_jobs(id),
  source_bucket text not null,
  source_path text not null,
  source_object_id uuid,
  available_after timestamptz,
  source_version text,
  mime_type text,
  byte_size bigint,
  disposition text not null check(disposition in ('delete','message','archive','blocked')),
  state text not null default 'pending' check(state in ('pending','switched','removed')),
  target_bucket text,
  target_path text,
  verified_sha256 text check(verified_sha256 ~ '^[a-f0-9]{64}$'),
  verified_byte_size bigint,
  unique(job_id,source_bucket,source_path)
);
-- Upload ownership outlives private attachment rows. Frozen paths remain fenced
-- after completion; expiry alone never authorizes deleting an unknown upload.
create table public.message_upload_claims (
  attachment_id uuid primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  relationship_id uuid not null,
  bucket_id text not null check(bucket_id='message-media'),
  object_path text not null,
  lease_token uuid not null,
  lease_until timestamptz not null,
  state text not null check(state in('active','settled','frozen')),
  deletion_job_id uuid references public.account_deletion_jobs(id),
  unique(bucket_id,object_path)
);
create index message_upload_claims_actor on public.message_upload_claims(actor_user_id);
create index account_deletion_objects_job on public.account_deletion_objects(job_id,state,id);
create unique index one_unfinished_object_deletion on public.account_deletion_objects(source_bucket,source_path) where state<>'removed';
-- A private preservation map, not a new card-image display API. Current History
-- renders no archived definition images. Future readers must authorize periods.
create table public.retained_account_media (
  id uuid primary key,
  source_bucket text not null,
  source_path text not null,
  bucket_id text not null,
  object_path text not null,
  sha256 text not null,
  byte_size bigint not null,
  mime_type text not null,
  relationship_ids uuid[] not null,
  unique(source_bucket,source_path)
);
do $$ declare t text; begin
  foreach t in array array['account_deletion_jobs','account_deletion_objects','retained_account_media','message_upload_claims'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
insert into storage.buckets(id,name,public) values('retained-account-media','retained-account-media',false);

create function public._deletion_service() returns void
language plpgsql security definer set search_path='' as $$ begin
  if auth.role() is distinct from 'service_role' then raise exception using errcode='42501',message='DELETION_SERVICE_REQUIRED'; end if;
end $$;
create function public._deletion_available(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select p_user is not null and exists(select 1 from auth.users where id=p_user)
    and not exists(select 1 from public.account_deletion_jobs where actor_user_id=p_user and phase<>'complete');
$$;
create function public._deletion_current_available() returns boolean
language sql stable security definer set search_path='' as $$ select public._deletion_available(auth.uid()); $$;
create function public._deletion_require_available(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
  if not public._deletion_available(p_user) then raise exception using errcode='42501',message='ACCOUNT_UNAVAILABLE'; end if;
end $$;

-- Keep the existing function OID so all action/lifecycle callers use this fence.
create or replace function public._identity_lock() returns void
language plpgsql volatile security definer set search_path='' as $$ begin
  perform pg_catalog.pg_advisory_xact_lock(1768187241,1919249505);
  if auth.role()='authenticated' then perform public._deletion_require_available(auth.uid()); end if;
end $$;

-- Each actual upload attempt gets a fencing token. Reclaimed expired leases
-- cannot make an older request's token valid again.
create function public.message_media_claim_upload(p_actor uuid,p_attachment_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.message_attachments%rowtype; c public.message_upload_claims%rowtype;
begin
  perform public._deletion_service(); perform public._identity_lock(); perform public._deletion_require_available(p_actor);
  select * into a from public.message_attachments where id=p_attachment_id;
  if a.id is null or a.bucket_id<>'message-media' or a.upload_id is null or not exists(select 1 from public.relationship_period_members where participant_id=a.uploader_participant_id and user_id=p_actor) then raise exception 'MESSAGE_ATTACHMENT_UNAVAILABLE'; end if;
  if a.status='ready' then return jsonb_build_object('upload',false); end if;
  select * into c from public.message_upload_claims where attachment_id=a.id for update;
  if c.state='frozen' then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
  if c.state='active' and c.lease_until>clock_timestamp() then raise exception 'MESSAGE_UPLOAD_BUSY'; end if;
  insert into public.message_upload_claims(attachment_id,actor_user_id,relationship_id,bucket_id,object_path,lease_token,lease_until,state)
    values(a.id,p_actor,a.relationship_id,a.bucket_id,a.object_path,pg_catalog.gen_random_uuid(),clock_timestamp()+interval '90 seconds','active')
    on conflict(attachment_id) do update set lease_token=excluded.lease_token,lease_until=excluded.lease_until,state='active' returning * into c;
  return jsonb_build_object('upload',true,'leaseToken',c.lease_token);
end $$;
create function public.message_media_settle_upload(p_actor uuid,p_attachment_id uuid,p_lease_token uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.message_upload_claims%rowtype;
begin
  perform public._deletion_service(); perform public._identity_lock();
  select * into c from public.message_upload_claims where attachment_id=p_attachment_id and actor_user_id=p_actor and lease_token=p_lease_token for update;
  if c.attachment_id is null then raise exception 'MESSAGE_UPLOAD_LEASE_EXPIRED'; end if;
  if c.state='frozen' then return; end if;
  if not exists(select 1 from storage.objects where bucket_id=c.bucket_id and name=c.object_path and owner is null and owner_id is null) then raise exception 'MESSAGE_UPLOAD_UNCONFIRMED'; end if;
  update public.message_upload_claims set state='settled' where attachment_id=c.attachment_id;
end $$;
create function public._deletion_upload_write_fence() returns trigger
language plpgsql security definer set search_path='' as $$
declare c public.message_upload_claims%rowtype;
begin
  if NEW.bucket_id<>'message-media' then return NEW; end if;
  -- The same transaction lock serializes final Storage metadata publication with
  -- deletion preparation. Applies to service uploads, not merely client RLS.
  perform public._identity_lock();
  select * into c from public.message_upload_claims where bucket_id=NEW.bucket_id and object_path=NEW.name;
  if c.attachment_id is not null and (c.state<>'active' or c.lease_until<=clock_timestamp()
      or NEW.user_metadata->>'uploadLeaseToken' is distinct from c.lease_token::text
      or not public._deletion_available(c.actor_user_id)) then
    raise exception using errcode='42501',message='MESSAGE_UPLOAD_FENCED'; end if;
  return NEW;
end $$;
create trigger account_deletion_upload_fence before insert or update of bucket_id,name,version,metadata,user_metadata on storage.objects
  for each row execute function public._deletion_upload_write_fence();

-- Detached legacy ownership preserves shared definition/history FKs. No row is
-- changed by migration, and no participant receives another person's identity.
do $$ declare t text; c text; target text; begin
  for t,c,target in select * from (values
    ('tasks','fk_user','public.profiles'),('rewards','rewards_user_id_fkey','public.profiles'),
    ('punishments','punishments_user_id_fkey','public.profiles'),('rules','rules_user_id_fkey','auth.users'),
    ('task_completion_history','task_completion_history_user_id_fkey','auth.users'),
    ('reward_usage','reward_usage_user_id_fkey','public.profiles'),
    ('rule_violations','rule_violations_user_id_fkey','public.profiles'),
    ('punishment_history','punishment_history_user_id_fkey','public.profiles')) s(t,c,target) loop
    execute format('alter table public.%I alter column user_id drop not null',t);
    execute format('alter table public.%I drop constraint %I',t,c);
    execute format('alter table public.%I add constraint %I foreign key(user_id) references %s(id) on delete set null',t,c,target);
  end loop;
end $$;

-- Match exact known media values, never substring-rewrite user text. JSON
-- traversal only detects references, including legacy background image arrays.
create function public._deletion_decode_path(p_value text) returns text
language plpgsql immutable set search_path='' as $$
declare result bytea:=''::bytea; i integer:=1; ch text;
begin
  while i<=length(p_value) loop
    ch:=substr(p_value,i,1);
    if ch='%' and substr(p_value,i+1,2) ~ '^[A-Fa-f0-9]{2}$' then
      result:=result||decode(substr(p_value,i+1,2),'hex'); i:=i+3;
    else result:=result||convert_to(ch,'UTF8'); i:=i+1; end if;
  end loop;
  return convert_from(result,'UTF8');
exception when character_not_in_repertoire then return p_value;
end $$;
create function public._deletion_references(p_value jsonb,p_bucket text,p_path text) returns boolean
language plpgsql immutable set search_path='' as $$
declare v text; x jsonb;
begin
  if jsonb_typeof(p_value)='string' then
    v:=p_value #>> '{}';
    return v=p_path or v=p_bucket||'/'||p_path or
      public._deletion_decode_path(split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/object/',2)) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path) or
      public._deletion_decode_path(split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/render/image/',2)) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path);
  elsif jsonb_typeof(p_value)='array' then
    for x in select value from jsonb_array_elements(p_value) loop
      if public._deletion_references(x,p_bucket,p_path) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value)='object' then
    for x in select value from jsonb_each(p_value) loop
      if public._deletion_references(x,p_bucket,p_path) then return true; end if;
    end loop;
  end if;
  return false;
end $$;
create function public._deletion_media_columns(p_row jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select jsonb_build_array(p_row->'background_image_url',p_row->'background_images',p_row->'background_image_path',
    p_row->'icon_url',p_row->'image_url',p_row->'avatar_url');
$$;
create function public._deletion_surviving_conversation(p_conversation uuid,p_actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.message_conversations c join public.relationship_period_members m
    on m.participant_id in(c.member_a,c.member_b) join auth.users u on u.id=m.user_id
    where c.id=p_conversation and m.user_id is distinct from p_actor);
$$;
create function public._deletion_media_class(p_bucket text,p_path text,p_actor uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare t text; r record; keep_archive boolean:=false; keep_message boolean:=false;
begin
  select exists(select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.bucket_id=p_bucket and a.object_path=p_path and public._deletion_surviving_conversation(m.conversation_id,p_actor)) into keep_message;
  for t in select unnest(array['tasks','rewards','rules','punishments']) loop
    for r in execute format('select d.relationship_id,d.user_id,public._deletion_media_columns(to_jsonb(d)) media from public.%I d',t) loop
      if public._deletion_references(r.media,p_bucket,p_path) and
        (r.user_id is distinct from p_actor or exists(select 1 from public.relationship_period_members
          where relationship_id=r.relationship_id and user_id is not null and user_id is distinct from p_actor)) then
        if r.relationship_id is null or exists(select 1 from public.relationship_periods where id=r.relationship_id and status='active') then return 'blocked'; end if;
        keep_archive:=true;
      end if;
    end loop;
  end loop;
  if exists(select 1 from public.profiles p where p.id is distinct from p_actor
      and public._deletion_references(to_jsonb(p.avatar_url),p_bucket,p_path)) or
     exists(select 1 from public.encyclopedia_entries e where public._deletion_references(to_jsonb(e),p_bucket,p_path)) or
     exists(select 1 from public.app_guide_content g where public._deletion_references(to_jsonb(g),p_bucket,p_path)) then return 'blocked'; end if;
  if exists(select 1 from public.retained_account_media a where a.bucket_id=p_bucket and a.object_path=p_path
    and exists(select 1 from public.relationship_period_members m join auth.users u on u.id=m.user_id
      where m.relationship_id=any(a.relationship_ids) and m.user_id is distinct from p_actor)) then keep_archive:=true; end if;
  -- Logos may be referenced by a browser-only saved selection, not a DB row.
  if p_bucket in ('logos','admin-documents') then return 'blocked'; end if;
  if keep_message then return 'message'; elsif keep_archive then return 'archive'; else return 'delete'; end if;
end $$;

create function public._deletion_media_write_guard() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if auth.role() in ('authenticated','anon') and exists(select 1 from public.account_deletion_objects o
    join public.account_deletion_jobs j on j.id=o.job_id where j.phase<>'complete'
      and public._deletion_references(public._deletion_media_columns(to_jsonb(NEW)),o.source_bucket,o.source_path)) then
    raise exception using errcode='42501',message='MEDIA_UNAVAILABLE';
  end if;
  return NEW;
end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','tasks','rewards','rules','punishments','encyclopedia_entries','app_guide_content'] loop
    execute format('create trigger account_deletion_media_reference before insert or update on public.%I for each row execute function public._deletion_media_write_guard()',t);
  end loop;
  -- Existing permissive policies cannot authorize a frozen/deleted account.
  foreach t in array array['profiles','user_notification_preferences','user_color_schemes','user_roles'] loop
    execute format('create policy account_deletion_fence on public.%I as restrictive for all to authenticated using (public._deletion_current_available()) with check (public._deletion_current_available())',t);
  end loop;
end $$;
create function public._deletion_storage_available(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select public._deletion_available(auth.uid()) and p_bucket<>'retained-account-media'
    and not exists(select 1 from public.account_deletion_objects o join public.account_deletion_jobs j on j.id=o.job_id
      where j.phase<>'complete' and o.source_bucket=p_bucket and o.source_path=p_path);
$$;
create policy deletion_storage_account_fence on storage.objects as restrictive for all to authenticated
  using(public._deletion_storage_available(bucket_id,name)) with check(public._deletion_storage_available(bucket_id,name));
create policy retained_account_media_private on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'retained-account-media') with check(bucket_id<>'retained-account-media');

create function public._deletion_status(j public.account_deletion_jobs) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('jobId',j.id,'state',case when j.phase='complete' then 'complete' when j.retry_required then 'retry_required' else 'pending' end,
    'phase',j.phase,'retryAfterMs',case when j.phase='complete' then 0 else greatest(1500,ceil(extract(epoch from coalesce(j.lease_until-clock_timestamp(),interval '0'))*1000)::integer) end,'completedAt',j.completed_at);
$$;
create function public._deletion_job(p_job uuid,p_hash text) returns public.account_deletion_jobs
language plpgsql security definer set search_path='' as $$ declare j public.account_deletion_jobs%rowtype; begin
  perform public._deletion_service();
  select * into j from public.account_deletion_jobs where id=p_job and recovery_hash=p_hash;
  if j.id is null then raise exception using errcode='42501',message='DELETION_UNAVAILABLE'; end if;
  return j;
end $$;
create function public.account_deletion_status(p_job_id uuid,p_recovery_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$ declare j public.account_deletion_jobs%rowtype; begin
  j:=public._deletion_job(p_job_id,p_recovery_hash); return public._deletion_status(j);
end $$;

-- Runs only for periods with NO remaining Auth-backed participant. Stable
-- evidence in any surviving shared period is never removed by this helper.
create function public._deletion_purge_period(p_period uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t text; ids uuid[]; attachments uuid[];
begin
  if exists(select 1 from public.relationship_period_members m join auth.users u on u.id=m.user_id where m.relationship_id=p_period) then
    raise exception using errcode='42501',message='DELETION_SURVIVOR_PRESENT'; end if;
  select array_agg(id) into ids from public.messages where relationship_id=p_period;
  select array_agg(id) into attachments from public.message_attachments where relationship_id=p_period;
  delete from public.message_legacy_sources where canonical_message_id=any(ids) or (source_table='archived_messages' and source_id in
    (select id from public.archived_messages where relationship_id=p_period));
  delete from public.message_legacy_quarantine where (source_table='messages' and source_id=any(ids)) or
    (source_table='archived_messages' and source_id in(select id from public.archived_messages where relationship_id=p_period));
  update public.messages set attachment_id=null where id=any(ids);
  update public.message_attachments set message_id=null where id=any(attachments);
  delete from public.messages where relationship_id=p_period;
  delete from public.archived_messages where relationship_id=p_period;
  delete from public.message_attachments where relationship_id=p_period;
  delete from public.message_conversations where relationship_id=p_period;
  foreach t in array array['notification_jobs','action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
    'task_completion_history','reward_usage','rule_violations','punishment_history','action_task_openings',
    'action_inventory_movements','reward_inventory_lots','action_point_entries'] loop
    execute format('delete from public.%I where relationship_id=$1',t) using p_period;
  end loop;
  update public.action_events set reverses_event_id=null where relationship_id=p_period;
  delete from public.action_events where relationship_id=p_period;
  delete from public.action_wallets where relationship_id=p_period;
  delete from public.action_accounting_periods where relationship_id=p_period;
  foreach t in array array['tasks','rewards','rules','punishments','wellbeing_snapshots'] loop
    execute format('delete from public.%I where relationship_id=$1',t) using p_period;
  end loop;
  delete from public.partner_link_invitations where previous_relationship_id=p_period;
  delete from public.relationship_period_members where relationship_id=p_period;
  delete from public.relationship_periods where id=p_period;
end $$;

create function public.begin_account_deletion(p_actor uuid,p_command_id uuid,p_expected_relationship_id uuid,
  p_expected_relationship_session_id uuid,p_recovery_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.account_deletion_jobs%rowtype; peer uuid; r record; period uuid; participants uuid[]; periods uuid[];
  self_messages uuid[]; self_attachments uuid[]; t text; disposition text; unsafe boolean;
begin
  perform public._deletion_service(); perform public._identity_lock();
  if p_actor is null or p_command_id is null or p_recovery_hash is null or p_recovery_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='22023',message='INVALID_DELETION_REQUEST'; end if;
  select * into j from public.account_deletion_jobs where id=p_command_id;
  if found then
    if j.actor_user_id is distinct from p_actor or j.expected_period_id is distinct from p_expected_relationship_id or
      j.expected_session_id is distinct from p_expected_relationship_session_id or j.recovery_hash is distinct from p_recovery_hash then
      raise exception using errcode='22023',message='DELETION_COMMAND_ID_REUSED'; end if;
    return public._deletion_status(j);
  end if;
  perform public._deletion_require_available(p_actor);
  perform public._messages_assert_scope(p_actor,p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._identity_require_lifecycle(p_actor);
  perform public._identity_require_accounting(p_expected_relationship_id);
  peer:=public._identity_peer(p_actor);
  if peer is not null then perform public._identity_require_lifecycle(peer); end if;
  perform 1 from public.profiles where id in(p_actor,peer) order by id for update;
  select array_agg(participant_id),array_agg(distinct relationship_id) into participants,periods
    from public.relationship_period_members where user_id=p_actor;
  if exists(select 1 from public.account_deletion_jobs where phase<>'complete' and affected_period_ids&&periods) then
    raise exception using errcode='55000',message='DELETION_BUSY'; end if;
  -- Unmapped ownership cannot be guessed or silently dropped.
  foreach t in array array['tasks','rewards','rules','punishments','task_completion_history','reward_usage','rule_violations','punishment_history'] loop
    execute format('select exists(select 1 from public.%I where user_id=$1 and relationship_id is null)',t) into unsafe using p_actor;
    if unsafe then raise exception using errcode='55000',message='DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
  end loop;
  -- Fail closed for inconsistent legacy graph ownership instead of cascading
  -- another person's rows through an otherwise participant-empty period.
  foreach period in array periods loop
    if not exists(select 1 from public.relationship_period_members where relationship_id=period and user_id is not null and user_id<>p_actor) then
      foreach t in array array['tasks','rewards','rules','punishments','task_completion_history','reward_usage','rule_violations','punishment_history'] loop
        execute format('select exists(select 1 from public.%I where relationship_id=$1 and user_id is not null and user_id<>$2)',t) into unsafe using period,p_actor;
        if unsafe then raise exception using errcode='55000',message='DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
      end loop;
      if exists(select 1 from public.task_completion_history h join public.tasks d on d.id=h.task_id where d.relationship_id=period and h.relationship_id is distinct from period) or
         exists(select 1 from public.reward_usage h join public.rewards d on d.id=h.reward_id where d.relationship_id=period and h.relationship_id is distinct from period) or
         exists(select 1 from public.rule_violations h join public.rules d on d.id=h.rule_id where d.relationship_id=period and h.relationship_id is distinct from period) or
         exists(select 1 from public.punishment_history h join public.punishments d on d.id=h.punishment_id where d.relationship_id=period and h.relationship_id is distinct from period) then
        raise exception using errcode='55000',message='DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
    end if;
  end loop;
  if exists(select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.relationship_id=any(periods) and public._deletion_surviving_conversation(m.conversation_id,p_actor)
      and not exists(select 1 from storage.objects o where o.bucket_id=a.bucket_id and o.name=a.object_path)) then
    raise exception using errcode='55000',message='DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
  if exists(select 1 from storage.buckets where owner=p_actor) then
    raise exception using errcode='55000',message='DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
  insert into public.account_deletion_jobs(id,actor_user_id,expected_period_id,expected_session_id,recovery_hash,affected_period_ids)
    values(p_command_id,p_actor,p_expected_relationship_id,p_expected_relationship_session_id,p_recovery_hash,periods) returning * into j;
  if peer is not null then perform public._identity_project_current_wallet(peer); end if;
  perform public._identity_project_current_wallet(p_actor);
  perform public._identity_archive(p_expected_relationship_id);
  update public.profiles set linked_partner_id=null where id in(p_actor,peer);
  delete from public.partner_link_invitations where user_id in(p_actor,peer);
  delete from public.identity_contexts where user_id=p_actor;
  if peer is not null then
    period:=public._identity_make_solo(peer); perform public.activate_action_accounting(period);
  end if;
  -- Capture every native pending path BEFORE removing attachment rows, even
  -- when no Storage metadata exists yet. This permanent fence also catches an
  -- old request paused between message_media_begin and the new upload claim.
  insert into public.message_upload_claims(attachment_id,actor_user_id,relationship_id,bucket_id,object_path,lease_token,lease_until,state,deletion_job_id)
    select a.id,p_actor,a.relationship_id,a.bucket_id,a.object_path,pg_catalog.gen_random_uuid(),clock_timestamp(),'frozen',j.id
    from public.message_attachments a where a.uploader_participant_id=any(participants) and a.bucket_id='message-media' and a.upload_id is not null
    on conflict(attachment_id) do update set state='frozen',deletion_job_id=j.id;
  update public.message_upload_claims set state='frozen',deletion_job_id=j.id where actor_user_id=p_actor;
  -- Snapshot every account-owned object plus service-owned unsent/message bytes
  -- before removing any application reference. Existing shared URLs are fenced.
  for r in select o.* from storage.objects o where o.owner=p_actor or o.owner_id=p_actor::text or (o.owner is null and o.owner_id is null and (exists(
    select 1 from public.message_attachments a where a.bucket_id=o.bucket_id and a.object_path=o.name
      and (a.uploader_participant_id=any(participants) or a.relationship_id=any(periods))) or exists(
      select 1 from public.retained_account_media a where a.bucket_id=o.bucket_id and a.object_path=o.name
        and a.relationship_ids&&periods))) loop
    disposition:=public._deletion_media_class(r.bucket_id,r.name,p_actor);
    -- A surviving partner's unrelated orphan upload is not this account's data.
    if disposition='delete' and r.owner is distinct from p_actor and r.owner_id is distinct from p_actor::text
      and not exists(select 1 from public.message_attachments a join public.relationship_period_members m on m.participant_id=a.uploader_participant_id
        where a.bucket_id=r.bucket_id and a.object_path=r.name and (a.uploader_participant_id=any(participants) or m.user_id is null))
      and not exists(select 1 from public.retained_account_media a
          where a.bucket_id=r.bucket_id and a.object_path=r.name and a.relationship_ids&&periods) then continue; end if;
    if disposition in('message','archive') and r.owner is null and r.owner_id is null then continue; end if;
    if exists(select 1 from public.account_deletion_objects where source_bucket=r.bucket_id and source_path=r.name and state<>'removed') then
      raise exception using errcode='55000',message='DELETION_BUSY'; end if;
    insert into public.account_deletion_objects(job_id,source_bucket,source_path,source_object_id,source_version,mime_type,byte_size,disposition,target_bucket,target_path)
      values(j.id,r.bucket_id,r.name,r.id,to_jsonb(r)->>'version',r.metadata->>'mimetype',(r.metadata->>'size')::bigint,disposition,
        case disposition when 'message' then 'message-media' when 'archive' then 'retained-account-media' end,
        case when disposition in('message','archive') then pg_catalog.gen_random_uuid()::text end);
  end loop;
  -- Frozen missing paths are cleanup work too; future metadata commits are
  -- rejected by the permanent trigger. A bounded wait lets accepted uploads
  -- settle, but the fence, not elapsed time, is what makes absence conclusive.
  insert into public.account_deletion_objects(job_id,source_bucket,source_path,source_object_id,source_version,available_after,mime_type,byte_size,disposition)
    select j.id,c.bucket_id,c.object_path,o.id,to_jsonb(o)->>'version',c.lease_until,o.metadata->>'mimetype',(o.metadata->>'size')::bigint,'delete'
    from public.message_upload_claims c left join storage.objects o on o.bucket_id=c.bucket_id and o.name=c.object_path
    where c.deletion_job_id=j.id and public._deletion_media_class(c.bucket_id,c.object_path,p_actor)='delete'
    on conflict(job_id,source_bucket,source_path) do update set available_after=excluded.available_after;
  select array_agg(m.id) into self_messages from public.messages m where m.sender_participant_id=any(participants)
    and not public._deletion_surviving_conversation(m.conversation_id,p_actor);
  select array_agg(a.id) into self_attachments from public.message_attachments a where a.uploader_participant_id=any(participants)
    and (a.message_id is null or a.message_id=any(self_messages));
  delete from public.message_legacy_sources where canonical_message_id=any(self_messages);
  delete from public.message_legacy_quarantine where source_table='messages' and source_id=any(self_messages);
  update public.messages set attachment_id=null where id=any(self_messages);
  update public.message_attachments set message_id=null where id=any(self_attachments);
  delete from public.messages where id=any(self_messages);
  delete from public.message_attachments where id=any(self_attachments);
  delete from public.archived_messages where sender_id=p_actor and (receiver_id=p_actor or receiver_id is null);
  delete from public.message_conversations c where c.kind='legacy_self' and c.member_a=any(participants);
  -- Identity fields detach; private audit snapshots remain private, unchanged.
  update public.relationship_period_members set user_id=null where user_id=p_actor;
  update public.messages set sender_id=null where sender_id=p_actor;
  update public.messages set receiver_id=null where receiver_id=p_actor;
  update public.archived_messages set sender_id=null where sender_id=p_actor;
  update public.archived_messages set receiver_id=null where receiver_id=p_actor;
  update public.action_command_receipts set actor_user_id=null where actor_user_id=p_actor;
  foreach t in array array['tasks','rewards','rules','punishments','task_completion_history','reward_usage','rule_violations','punishment_history'] loop
    execute format('update public.%I set user_id=null where user_id=$1',t) using p_actor;
  end loop;
  delete from public.notification_jobs where recipient_user_id=p_actor;
  delete from public.user_push_subscriptions where user_id=p_actor;
  delete from public.user_notification_preferences where user_id=p_actor;
  delete from public.user_color_schemes where user_id=p_actor;
  delete from public.user_roles where user_id=p_actor;
  delete from public.admin_document_readers where user_id=p_actor;
  delete from public.solo_role_change_receipts where actor_user_id=p_actor;
  -- Wellbeing and reminders are private account data, not a new shared archive.
  delete from public.profiles where id=p_actor;
  foreach period in array periods loop
    if not exists(select 1 from public.relationship_period_members where relationship_id=period and user_id is not null) then
      perform public._deletion_purge_period(period);
    end if;
  end loop;
  return public._deletion_status(j);
end $$;

create function public.claim_account_deletion(p_job_id uuid,p_recovery_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.account_deletion_jobs%rowtype; o public.account_deletion_objects%rowtype; token uuid:=pg_catalog.gen_random_uuid(); v_disposition text;
begin
  j:=public._deletion_job(p_job_id,p_recovery_hash); perform public._identity_lock();
  select * into j from public.account_deletion_jobs where id=j.id for update;
  if j.phase='complete' or j.lease_until>clock_timestamp() then return jsonb_build_object('status',public._deletion_status(j),'work',null); end if;
  select * into o from public.account_deletion_objects where job_id=j.id and state<>'removed' order by id limit 1;
  if o.id is not null then
    if o.available_after>clock_timestamp() then
      return jsonb_build_object('status',public._deletion_status(j)||jsonb_build_object('retryAfterMs',greatest(1500,ceil(extract(epoch from o.available_after-clock_timestamp())*1000)::integer)),'work',null);
    end if;
    if exists(select 1 from storage.objects s where s.bucket_id=o.source_bucket and s.name=o.source_path
      and (s.id is distinct from o.source_object_id or (to_jsonb(s)->>'version') is distinct from o.source_version)) then
      update public.account_deletion_jobs set retry_required=true,lease_token=null,lease_until=null where id=j.id returning * into j;
      return jsonb_build_object('status',public._deletion_status(j),'work',null);
    end if;
    v_disposition:=public._deletion_media_class(o.source_bucket,o.source_path,j.actor_user_id);
    if v_disposition='blocked' then
      update public.account_deletion_jobs set retry_required=true where id=j.id returning * into j;
      return jsonb_build_object('status',public._deletion_status(j),'work',null);
    end if;
    if o.disposition='blocked' then
      update public.account_deletion_objects set disposition=v_disposition,
        target_bucket=case v_disposition when 'message' then 'message-media' when 'archive' then 'retained-account-media' end,
        target_path=case when v_disposition in('message','archive') then pg_catalog.gen_random_uuid()::text end
        where id=o.id returning * into o;
    end if;
  else
    -- Catch unexpected owned uploads rather than falsely completing. The normal
    -- old-JWT upload paths are fenced, but trusted operators remain independent.
    if exists(select 1 from storage.objects where owner=j.actor_user_id or owner_id=j.actor_user_id::text) then
      update public.account_deletion_jobs set retry_required=true where id=j.id returning * into j;
      return jsonb_build_object('status',public._deletion_status(j),'work',null);
    end if;
  end if;
  update public.account_deletion_jobs set lease_token=token,lease_until=clock_timestamp()+interval '90 seconds',retry_required=false,
    phase=case when o.id is null then 'account' else 'storage' end where id=j.id returning * into j;
  return jsonb_build_object('status',public._deletion_status(j),'work',case when o.id is null then
    jsonb_build_object('kind','account','leaseToken',token,'actorUserId',j.actor_user_id) else
    jsonb_build_object('kind','storage','leaseToken',token,'objectId',o.id,'state',o.state,'disposition',o.disposition,
      'sourceBucket',o.source_bucket,'sourcePath',o.source_path,'targetBucket',o.target_bucket,'targetPath',o.target_path,
      'mimeType',o.mime_type,'byteSize',o.byte_size,'sha256',o.verified_sha256) end);
end $$;

create function public._deletion_require_lease(p_job uuid,p_lease uuid) returns public.account_deletion_jobs
language plpgsql security definer set search_path='' as $$ declare j public.account_deletion_jobs%rowtype; begin
  perform public._deletion_service(); perform public._identity_lock();
  select * into j from public.account_deletion_jobs where id=p_job and lease_token=p_lease and lease_until>clock_timestamp() for update;
  if j.id is null then raise exception using errcode='42501',message='DELETION_LEASE_EXPIRED'; end if;
  return j;
end $$;
create function public.switch_account_deletion_object(p_job_id uuid,p_lease_token uuid,p_object_id uuid,p_sha256 text,p_byte_size bigint,p_mime_type text) returns void
language plpgsql security definer set search_path='' as $$
declare j public.account_deletion_jobs%rowtype; o public.account_deletion_objects%rowtype; periods uuid[]; t text; r record;
begin
  j:=public._deletion_require_lease(p_job_id,p_lease_token);
  select * into o from public.account_deletion_objects where id=p_object_id and job_id=j.id for update;
  if o.id is null or o.disposition not in('message','archive') or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' or p_byte_size is null or p_byte_size<1 or p_mime_type is null then
    raise exception using errcode='22023',message='DELETION_OBJECT_INVALID'; end if;
  if o.state='switched' then
    if o.verified_sha256 is distinct from p_sha256 or o.verified_byte_size is distinct from p_byte_size then raise exception 'DELETION_OBJECT_CHANGED'; end if;
    return;
  end if;
  if not exists(select 1 from storage.objects where bucket_id=o.target_bucket and name=o.target_path and owner is null and owner_id is null
    and (metadata->>'size')::bigint=p_byte_size and metadata->>'mimetype'=p_mime_type) then raise exception 'DELETION_TARGET_UNVERIFIED'; end if;
  if public._deletion_media_class(o.source_bucket,o.source_path,j.actor_user_id)='blocked' then raise exception 'DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
  if exists(select 1 from public.message_attachments where bucket_id=o.source_bucket and object_path=o.source_path
    and (sha256<>p_sha256 or byte_size<>p_byte_size or mime_type<>p_mime_type)) then raise exception 'DELETION_OBJECT_CHANGED'; end if;
  update public.message_attachments set bucket_id=o.target_bucket,object_path=o.target_path
    where bucket_id=o.source_bucket and object_path=o.source_path;
  -- Legacy image_url is private source evidence; the client sees attachment IDs.
  -- Keep exact historical source text rather than rewriting arbitrary strings.
  periods:='{}';
  for t in select unnest(array['tasks','rewards','rules','punishments']) loop
    for r in execute format('select d.relationship_id,public._deletion_media_columns(to_jsonb(d)) media from public.%I d',t) loop
      if r.relationship_id is not null and public._deletion_references(r.media,o.source_bucket,o.source_path) then periods:=array_append(periods,r.relationship_id); end if;
    end loop;
  end loop;
  if cardinality(periods)>0 then insert into public.retained_account_media(id,source_bucket,source_path,bucket_id,object_path,sha256,byte_size,mime_type,relationship_ids)
    values(o.id,o.source_bucket,o.source_path,o.target_bucket,o.target_path,p_sha256,p_byte_size,p_mime_type,periods)
    on conflict(source_bucket,source_path) do update set bucket_id=excluded.bucket_id,object_path=excluded.object_path,
      sha256=excluded.sha256,byte_size=excluded.byte_size,mime_type=excluded.mime_type,relationship_ids=excluded.relationship_ids; end if;
  update public.account_deletion_objects set state='switched',verified_sha256=p_sha256,verified_byte_size=p_byte_size where id=o.id;
end $$;
-- Fence the irreversible external call again after copy/readback/switch work.
-- The HTTP deadline is45s; this lease lasts90s. No client may reuse this source
-- path while unfinished, and retries retain the exact prepared object identity.
create function public.authorize_account_deletion_object_removal(p_job_id uuid,p_lease_token uuid,p_object_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare j public.account_deletion_jobs%rowtype; o public.account_deletion_objects%rowtype;
begin
  j:=public._deletion_require_lease(p_job_id,p_lease_token);
  select * into o from public.account_deletion_objects where id=p_object_id and job_id=j.id;
  if o.id is null or o.state='removed' or (o.disposition<>'delete' and o.state<>'switched') then raise exception 'DELETION_OBJECT_INVALID'; end if;
  if exists(select 1 from storage.objects s where s.bucket_id=o.source_bucket and s.name=o.source_path
    and (s.id is distinct from o.source_object_id or (to_jsonb(s)->>'version') is distinct from o.source_version)) then raise exception 'DELETION_OBJECT_CHANGED'; end if;
  if public._deletion_media_class(o.source_bucket,o.source_path,j.actor_user_id)='blocked' then raise exception 'DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
  if o.disposition='delete' and public._deletion_media_class(o.source_bucket,o.source_path,j.actor_user_id)<>'delete' then raise exception 'DELETION_REFERENCE_REVIEW_REQUIRED'; end if;
end $$;
create function public.finish_account_deletion_object(p_job_id uuid,p_lease_token uuid,p_object_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ declare j public.account_deletion_jobs%rowtype; o public.account_deletion_objects%rowtype; begin
  j:=public._deletion_require_lease(p_job_id,p_lease_token);
  select * into o from public.account_deletion_objects where job_id=j.id and id=p_object_id for update;
  if o.id is null or (o.disposition<>'delete' and o.state<>'switched') or exists(select 1 from storage.objects where bucket_id=o.source_bucket and name=o.source_path) then
    raise exception using errcode='55000',message='DELETION_OBJECT_REMAINS'; end if;
  update public.account_deletion_objects set state='removed' where id=o.id;
  delete from public.retained_account_media where bucket_id=o.source_bucket and object_path=o.source_path;
  update public.account_deletion_jobs set lease_token=null,lease_until=null,retry_required=false where id=j.id returning * into j;
  return public._deletion_status(j);
end $$;
create function public.finish_account_deletion(p_job_id uuid,p_lease_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ declare j public.account_deletion_jobs%rowtype; begin
  j:=public._deletion_require_lease(p_job_id,p_lease_token);
  if j.phase<>'account' or j.actor_user_id is not null or exists(select 1 from public.account_deletion_objects where job_id=j.id and state<>'removed') then
    raise exception using errcode='55000',message='DELETION_NOT_FINISHED'; end if;
  update public.account_deletion_jobs set phase='complete',completed_at=clock_timestamp(),lease_token=null,lease_until=null,retry_required=false where id=j.id returning * into j;
  return public._deletion_status(j);
end $$;
create function public.fail_account_deletion(p_job_id uuid,p_lease_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ declare j public.account_deletion_jobs%rowtype; begin
  perform public._deletion_service();
  update public.account_deletion_jobs set retry_required=true,lease_token=null,lease_until=null
    where id=p_job_id and lease_token=p_lease_token and phase<>'complete' returning * into j;
  if j.id is null then raise exception using errcode='42501',message='DELETION_LEASE_EXPIRED'; end if;
  return public._deletion_status(j);
end $$;

-- Keep legacy direct deletion blocked. Auth removal is authorized only after a
-- prepared service job reaches account phase; direct Admin deletes must not
-- accidentally bypass Storage/retention preparation for application accounts.
create function public._deletion_auth_guard() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if exists(select 1 from public.profiles where id=OLD.id) or exists(select 1 from public.relationship_period_members where user_id=OLD.id) then
    raise exception using errcode='42501',message='ACCOUNT_DELETION_COMMAND_REQUIRED'; end if;
  if exists(select 1 from public.account_deletion_jobs where actor_user_id=OLD.id and (phase<>'account' or lease_until is null or lease_until<=clock_timestamp() or lease_token is null or exists(select 1 from public.account_deletion_objects o where o.job_id=account_deletion_jobs.id and o.state<>'removed'))) then
    raise exception using errcode='42501',message='ACCOUNT_DELETION_NOT_READY'; end if;
  return OLD;
end $$;
create trigger account_deletion_prepared before delete on auth.users for each row execute function public._deletion_auth_guard();

-- Caller availability additions to existing notification APIs and service media
-- boundaries are emitted below, retaining their exact public signatures/OIDs.

create or replace function public.get_my_identity() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); p public.profiles%rowtype; peer public.profiles%rowtype;
  c public.identity_contexts%rowtype; r public.relationship_periods%rowtype;
  v_status text; v_participant uuid; v_code text; v_sub uuid; v_dom uuid;
begin
  perform public._deletion_require_available(auth.uid());
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  select * into p from public.profiles where id = v_actor;
  select * into c from public.identity_contexts where user_id = v_actor;
  select * into r from public.relationship_periods where id = c.relationship_id;
  select participant_id into v_participant from public.relationship_period_members
    where relationship_id = c.relationship_id and user_id = v_actor;
  if p.id is null then v_status := 'missing_profile';
  elsif p.role not in ('dom','sub') or p.role is null then v_status := 'invalid_role';
  elsif p.linked_partner_id is null then
    if public.current_relationship_id() is null then v_status := 'incomplete_partner';
    else v_status := 'ready_solo'; end if;
  elsif p.linked_partner_id = p.id then v_status := 'invalid_partner';
  else
    select * into peer from public.profiles where id = p.linked_partner_id;
    if peer.id is null or peer.role not in ('dom','sub') then v_status := 'invalid_partner';
    elsif peer.linked_partner_id is distinct from p.id then v_status := 'incomplete_partner';
    elsif peer.role = p.role then v_status := 'same_role';
    elsif public._identity_peer(v_actor) is null then v_status := 'incomplete_partner';
    else v_status := 'ready_linked'; end if;
  end if;
  if v_status in ('ready_solo','ready_linked') then
    if p.role = 'dom' then v_dom := p.id; else v_sub := p.id; end if;
    if v_status = 'ready_linked' then
      if peer.role = 'dom' then v_dom := peer.id; else v_sub := peer.id; end if;
    else
      select code into v_code from public.partner_link_invitations where user_id = v_actor;
    end if;
  end if;
  return jsonb_build_object('status',v_status,'user_id',v_actor,'role',p.role,
    'linked_partner_id',p.linked_partner_id,'partner_role',peer.role,
    'sub_user_id',v_sub,'dom_user_id',v_dom,'relationship_id',c.relationship_id,
    'relationship_status',r.status,'participant_id',v_participant,
    'relationship_session_id',case when r.status='active' and v_participant is not null then r.relationship_session_id end,
    'permissions',coalesce(r.permissions,'{}'::jsonb),'lifecycle_ready',coalesce(c.lifecycle_ready,false),
    'timezone',p.timezone,'partner_link_code',v_code);
end;
$$;

create or replace function public.get_my_push_device(p_device_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.user_push_subscriptions%rowtype;
begin
  perform public._deletion_require_available(auth.uid());
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into s from public.user_push_subscriptions where user_id=auth.uid() and device_id=p_device_id;
  return jsonb_build_object('deviceId',p_device_id,'subscriptionId',s.id,'enabled',coalesce(s.enabled,false),
    'vapidKeyId',s.vapid_key_id);
end $$;

create or replace function public.register_my_push_device(p_device_id uuid,p_endpoint text,p_p256dh text,p_auth text,p_vapid_key_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare configured text; s public.user_push_subscriptions%rowtype;
begin
  perform public._deletion_require_available(auth.uid());
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

create or replace function public.revoke_my_push_device(p_device_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public._deletion_require_available(auth.uid());
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  update public.user_push_subscriptions set enabled=false,binding_version=pg_catalog.gen_random_uuid()
    where user_id=auth.uid() and device_id=p_device_id;
end $$;

create or replace function public.request_my_push_test(p_device_id uuid,p_command_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.notification_jobs%rowtype; s public.user_push_subscriptions%rowtype; configured text;
begin
  perform public._deletion_require_available(auth.uid());
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

create or replace function public.get_my_push_test(p_command_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.notification_jobs%rowtype; d public.notification_deliveries%rowtype; status text;
begin
  perform public._deletion_require_available(auth.uid());
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into j from public.notification_jobs where source_kind='diagnostic' and source_id=p_command_id and recipient_user_id=auth.uid();
  if j.id is null then return null; end if;
  select * into d from public.notification_deliveries where job_id=j.id;
  status:=case when d.state='accepted' then 'acceptedByPushService' when d.state='failed' then 'failed'
    when d.state='skipped' or j.state='skipped' or j.expires_at<=clock_timestamp() then 'skipped' else 'queued' end;
  return jsonb_build_object('commandId',p_command_id,'deviceId',j.target_device_id,'jobId',j.id,'status',status);
end $$;

create or replace function public.get_my_wellness_reminder() returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.wellness_reminders%rowtype;
begin
  perform public._deletion_require_available(auth.uid());
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into r from public.wellness_reminders where user_id=auth.uid();
  if not found then return null; end if;
  return to_jsonb(r)-'schedule_version';
end $$;

create or replace function public.save_my_wellness_reminder(p_enabled boolean,p_reminder_time time) returns jsonb
language plpgsql security definer set search_path='' as $$
declare tz text; r public.wellness_reminders%rowtype;
begin
  perform public._deletion_require_available(auth.uid());
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

create or replace function public.message_media_read(p_actor uuid,p_attachment_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.message_attachments%rowtype; allowed boolean;
begin
  perform public._deletion_require_available(p_actor);
  if p_actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._identity_lock();
  select * into a from public.message_attachments where id=p_attachment_id;
  if a.message_id is null then
    allowed:=exists(select 1 from public.relationship_period_members where participant_id=a.uploader_participant_id and user_id=p_actor);
  else
    select public._messages_can_read(p_actor,conversation_id) into allowed from public.messages where id=a.message_id and attachment_id=a.id;
  end if;
  if a.id is null or a.status<>'ready' or not coalesce(allowed,false) then raise exception using errcode='42501',message='MESSAGE_ATTACHMENT_UNAVAILABLE'; end if;
  return jsonb_build_object('attachmentId',a.id,'bucket',a.bucket_id,'objectPath',a.object_path,'mimeType',a.mime_type,'byteSize',a.byte_size,'sha256',a.sha256);
end $$;

-- Helpers have no default PUBLIC execution. Only the two availability predicates
-- used by RLS are exposed; they cannot enumerate another account's identity.
do $$ declare r record; begin
  for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like '\_deletion\_%' escape '\' or p.proname in
      ('begin_account_deletion','account_deletion_status','claim_account_deletion','switch_account_deletion_object',
       'message_media_claim_upload','message_media_settle_upload','authorize_account_deletion_object_removal','finish_account_deletion_object','finish_account_deletion','fail_account_deletion')) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
  end loop;
end $$;
grant execute on function public._deletion_current_available(),public._deletion_storage_available(text,text) to authenticated;
grant execute on function public.message_media_claim_upload(uuid,uuid),public.message_media_settle_upload(uuid,uuid,uuid) to service_role;
grant execute on function public.begin_account_deletion(uuid,uuid,uuid,uuid,text),public.account_deletion_status(uuid,text),
  public.claim_account_deletion(uuid,text),public.switch_account_deletion_object(uuid,uuid,uuid,text,bigint,text),
  public.authorize_account_deletion_object_removal(uuid,uuid,uuid),public.finish_account_deletion_object(uuid,uuid,uuid),public.finish_account_deletion(uuid,uuid),public.fail_account_deletion(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
