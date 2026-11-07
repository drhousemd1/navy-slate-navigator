-- Additive wellbeing check-ins. No account/relationship gates are enabled.
-- Existing rows retain both timestamps, stored metrics/score and unknown calendar.
begin;
alter table public.wellbeing_snapshots
  add column submission_id uuid,
  add column participant_id uuid references public.relationship_period_members(participant_id),
  add column relationship_session_id uuid,
  add column recorded_at timestamptz,
  add column client_reported_at timestamptz,
  add column recorded_timezone text,
  add column local_date date,
  add column score_version text;
create unique index wellbeing_submission_owner on public.wellbeing_snapshots(user_id,submission_id) where submission_id is not null;
create index wellbeing_dated_history on public.wellbeing_snapshots(relationship_id,user_id,local_date,recorded_at desc,id desc);
alter table public.wellbeing_snapshots add constraint wellbeing_checkin_metadata check (
  (submission_id is null and participant_id is null and relationship_session_id is null and recorded_at is null
    and client_reported_at is null and recorded_timezone is null and local_date is null and score_version is null)
  or (submission_id is not null and participant_id is not null and relationship_session_id is not null
    and recorded_at is not null and client_reported_at is not null and recorded_timezone is not null
    and local_date is not null and score_version='needs-v1'));

create function public._wellbeing_score(p_metrics jsonb) returns integer
language plpgsql immutable set search_path='' as $$
declare k text; v numeric; total numeric:=0;
  keys text[]:=array['anxiety','stress','irritability','overwhelm','energy','intimacy','physical_touch','emotional_support'];
begin
  if p_metrics is null or jsonb_typeof(p_metrics)<>'object' then
    raise exception using errcode='22023',message='INVALID_WELLBEING_METRICS'; end if;
  if (select count(*) from jsonb_object_keys(p_metrics))<>8 then
    raise exception using errcode='22023',message='INVALID_WELLBEING_METRICS'; end if;
  foreach k in array keys loop
    if jsonb_typeof(p_metrics->k) is distinct from 'number' then
      raise exception using errcode='22023',message='INVALID_WELLBEING_METRICS'; end if;
    v:=(p_metrics->>k)::numeric;
    if v<0 or v>100 then raise exception using errcode='22023',message='INVALID_WELLBEING_METRICS'; end if;
    total:=total+case when k='energy' then v else 100-v end;
  end loop;
  return round(total/8)::integer;
end $$;

create function public._wellbeing_dto(h public.wellbeing_snapshots) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('id',h.id,'userId',h.user_id,'participantId',h.participant_id,
    'relationshipId',h.relationship_id,'relationshipSessionId',h.relationship_session_id,'commandId',h.submission_id,
    'metrics',h.metrics,'overallScore',h.overall_score,'scoreVersion',h.score_version,
    'recordedAt',h.recorded_at,'clientReportedAt',h.client_reported_at,'timezone',h.recorded_timezone,'localDate',h.local_date,
    'provenance',case when h.submission_id is null then 'legacy_snapshot' else 'confirmed_checkin' end,
    'legacyCreatedAt',case when h.submission_id is null then h.created_at end,
    'legacyUpdatedAt',case when h.submission_id is null then h.updated_at end);
$$;

-- Private server helper: current verified membership, never arbitrary partner IDs.
create function public._wellbeing_require_scope(p_period uuid,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_period,p_session);
  if public.current_relationship_id() is distinct from p_period then
    raise exception using errcode='42501',message='VALID_IDENTITY_REQUIRED'; end if;
  if not exists(select 1 from public.relationship_period_members m join public.identity_contexts c
    on c.user_id=m.user_id and c.relationship_id=m.relationship_id
    where m.relationship_id=p_period and m.user_id=auth.uid()) then
    raise exception using errcode='42501',message='VALID_IDENTITY_REQUIRED'; end if;
end $$;

create function public.get_my_wellbeing_receipt(p_command_id uuid,p_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.wellbeing_snapshots%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  perform public._identity_lock();
  select * into h from public.wellbeing_snapshots where user_id=auth.uid() and submission_id=p_command_id and relationship_id=p_relationship_id;
  if not found then return null; end if;
  return public._wellbeing_dto(h);
end $$;

create function public.save_wellbeing_checkin(p_command_id uuid,p_expected_relationship_id uuid,
  p_expected_relationship_session_id uuid,p_expected_timezone text,p_metrics jsonb,p_client_reported_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.wellbeing_snapshots%rowtype; v_tz text; v_participant uuid; v_at timestamptz; v_score integer;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_command_id is null or p_client_reported_at is null or not isfinite(p_client_reported_at) then
    raise exception using errcode='22023',message='INVALID_WELLBEING_REQUEST'; end if;
  perform public._identity_lock();
  -- Receipt-first retry never creates or moves an old report after a transition.
  select * into h from public.wellbeing_snapshots where user_id=auth.uid() and submission_id=p_command_id;
  if found then
    if h.relationship_id is distinct from p_expected_relationship_id or
      h.relationship_session_id is distinct from p_expected_relationship_session_id or
      h.recorded_timezone is distinct from p_expected_timezone or h.metrics is distinct from p_metrics or
      h.client_reported_at is distinct from p_client_reported_at then
      raise exception using errcode='22023',message='COMMAND_ID_REUSED'; end if;
    return public._wellbeing_dto(h);
  end if;
  perform public._wellbeing_require_scope(p_expected_relationship_id,p_expected_relationship_session_id);
  select p.timezone,m.participant_id into v_tz,v_participant from public.profiles p
    join public.relationship_period_members m on m.user_id=p.id and m.relationship_id=p_expected_relationship_id
    where p.id=auth.uid();
  if v_tz is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
  if v_tz is distinct from p_expected_timezone then raise exception using errcode='22023',message='WELLBEING_TIMEZONE_CHANGED'; end if;
  v_score:=public._wellbeing_score(p_metrics); v_at:=clock_timestamp();
  insert into public.wellbeing_snapshots(user_id,relationship_id,submission_id,participant_id,relationship_session_id,
    recorded_at,client_reported_at,recorded_timezone,local_date,score_version,metrics,overall_score,created_at,updated_at)
  values(auth.uid(),p_expected_relationship_id,p_command_id,v_participant,p_expected_relationship_session_id,
    v_at,p_client_reported_at,v_tz,(v_at at time zone v_tz)::date,'needs-v1',p_metrics,v_score,v_at,v_at) returning * into h;
  -- The confirmed check-in ID is the notification event seam. No client push or
  -- delivery is performed here; a separately reviewed outbox can consume it.
  return public._wellbeing_dto(h);
end $$;

create function public.get_wellbeing_status(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform public._wellbeing_require_scope(p_expected_relationship_id,p_expected_relationship_session_id);
  select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'role',m.role,'timezone',p.timezone,'latest',
    (select public._wellbeing_dto(h) from public.wellbeing_snapshots h
      where h.relationship_id=m.relationship_id and h.user_id=m.user_id
      order by coalesce(h.recorded_at,h.updated_at) desc,h.id desc limit 1)) order by m.role),'[]'::jsonb)
    into result from public.relationship_period_members m join public.profiles p on p.id=m.user_id
    where m.relationship_id=p_expected_relationship_id and
      (m.user_id=auth.uid() or m.user_id=public._identity_peer(auth.uid()));
  return result;
end $$;

-- Null date bounds explicitly request retained legacy snapshots. They are not
-- assigned a calendar date from today's timezone or their initial creation date.
create function public.list_wellbeing_checkins(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,
  p_subject_user_id uuid,p_start_date date default null,p_end_date date default null,
  p_before_recorded_at timestamptz default null,p_before_id uuid default null,p_mode text default 'dated',p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform public._wellbeing_require_scope(p_expected_relationship_id,p_expected_relationship_session_id);
  if p_subject_user_id is null or (p_subject_user_id<>auth.uid() and p_subject_user_id is distinct from public._identity_peer(auth.uid())) then
    raise exception using errcode='42501',message='WELLBEING_READ_NOT_ALLOWED'; end if;
  if p_mode is null or p_mode not in ('dated','legacy') or p_limit is null or p_limit<1 or p_limit>100 or
    (p_mode='dated' and (p_start_date is null or p_end_date is null)) or
    (p_mode='legacy' and (p_start_date is not null or p_end_date is not null)) or
    (p_start_date is not null and (p_end_date<=p_start_date or p_end_date-p_start_date>366)) or
    (p_before_recorded_at is null)<>(p_before_id is null) then
    raise exception using errcode='22023',message='INVALID_WELLBEING_RANGE'; end if;
  select coalesce(jsonb_agg(public._wellbeing_dto(h) order by coalesce(h.recorded_at,h.updated_at) desc,h.id desc),'[]'::jsonb) into result
    from (select s.* from public.wellbeing_snapshots s where s.relationship_id=p_expected_relationship_id and s.user_id=p_subject_user_id
      and ((p_mode='legacy' and s.submission_id is null) or (p_mode='dated' and s.local_date>=p_start_date and s.local_date<p_end_date))
      and (p_before_recorded_at is null or (coalesce(s.recorded_at,s.updated_at),s.id)<(p_before_recorded_at,p_before_id))
      order by coalesce(s.recorded_at,s.updated_at) desc,s.id desc limit p_limit) h;
  return result;
end $$;

-- Client access goes through the guarded DTO boundary. This also closes the old
-- pair-wide ALL policy's ability to overwrite another person's self-report.
revoke all on public.wellbeing_snapshots from public,anon,authenticated;
revoke all on function public._wellbeing_score(jsonb),public._wellbeing_dto(public.wellbeing_snapshots),
  public._wellbeing_require_scope(uuid,uuid),public.get_my_wellbeing_receipt(uuid,uuid),
  public.save_wellbeing_checkin(uuid,uuid,uuid,text,jsonb,timestamptz),public.get_wellbeing_status(uuid,uuid),
  public.list_wellbeing_checkins(uuid,uuid,uuid,date,date,timestamptz,uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_my_wellbeing_receipt(uuid,uuid),public.save_wellbeing_checkin(uuid,uuid,uuid,text,jsonb,timestamptz),
  public.get_wellbeing_status(uuid,uuid),public.list_wellbeing_checkins(uuid,uuid,uuid,date,date,timestamptz,uuid,text,integer) to authenticated;
commit;
