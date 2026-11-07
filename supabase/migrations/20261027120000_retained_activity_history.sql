-- Read-only retained activity. No activation, backfill, changed table policy,
-- identity transition or account-deletion behavior is introduced here.
begin;

-- Imported rows remain original evidence, never manufactured action receipts.
create index retained_task_history_page on public.task_completion_history(relationship_id,completed_at desc nulls last,id desc) where action_event_id is null;
create index retained_reward_history_page on public.reward_usage(relationship_id,created_at desc nulls last,id desc) where action_event_id is null;
create index retained_rule_history_page on public.rule_violations(relationship_id,violation_date desc nulls last,id desc) where action_event_id is null;
create index retained_punishment_history_page on public.punishment_history(relationship_id,applied_date desc nulls last,id desc) where action_event_id is null;

create function public._retained_activity_require_scope(p_period uuid,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  -- Serializes against existing lifecycle commands for this read transaction.
  perform public._identity_require_session(p_period,p_session);
  if not coalesce((public.get_my_identity()->>'status') in ('ready_solo','ready_linked'),false) then
    raise exception using errcode='42501',message='VALID_IDENTITY_REQUIRED';
  end if;
end $$;

create function public._retained_activity_person(p_viewer uuid,p_period uuid,p_participant uuid) returns text
language sql stable security definer set search_path='' as $$
  select coalesce((select case when m.user_id=p_viewer then 'you'
    when m.user_id is null then 'deleted_account' else 'former_partner' end
    from public.relationship_period_members m where m.relationship_id=p_period and m.participant_id=p_participant),'not_recorded');
$$;

create function public._retained_activity_calendar(p_calendar jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select case when jsonb_typeof(p_calendar->'localDate')='string'
    and jsonb_typeof(p_calendar->'weekStartDate')='string' and jsonb_typeof(p_calendar->'timeZone')='string'
    then jsonb_build_object('localDate',p_calendar->>'localDate','weekStartDate',p_calendar->>'weekStartDate','timeZone',p_calendar->>'timeZone')
    else null end;
$$;

create function public.list_my_retained_activity_periods(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_periods jsonb;
begin
  perform public._retained_activity_require_scope(p_expected_relationship_id,p_expected_relationship_session_id);
  select coalesce(jsonb_agg(jsonb_build_object('periodId',r.id,'startedAt',r.started_at,'endedAt',r.ended_at,
    'label',case when (select count(*) from public.relationship_period_members x where x.relationship_id=r.id)=1 then 'Earlier solo period'
      when exists(select 1 from public.relationship_period_members x where x.relationship_id=r.id and x.user_id is null) then 'Deleted account'
      else 'Former partner' end) order by r.ended_at desc nulls last,r.started_at desc,r.id desc),'[]'::jsonb)
    into v_periods
  from public.relationship_periods r join public.relationship_period_members own on own.relationship_id=r.id and own.user_id=auth.uid()
  where r.status='archived' and r.id<>p_expected_relationship_id;
  return jsonb_build_object('scope',jsonb_build_object('currentPeriodId',p_expected_relationship_id,'currentSessionId',p_expected_relationship_session_id),'periods',v_periods);
end $$;

create function public.get_my_retained_activity_history(
  p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,p_retained_relationship_id uuid,
  p_domain text,p_cursor text default null,p_limit integer default 30
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_period public.relationship_periods%rowtype; v_binding text; v_cursor jsonb;
  v_after_at timestamptz; v_after_source text; v_after_id uuid;
  v_rows jsonb:='[]'::jsonb; v_points jsonb; v_next text; v_last jsonb; v_count integer:=0; r record;
begin
  perform public._retained_activity_require_scope(p_expected_relationship_id,p_expected_relationship_session_id);
  if p_domain is null or p_domain not in ('task','reward','rule','punishment') then
    raise exception using errcode='22023',message='INVALID_HISTORY_DOMAIN'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception using errcode='22023',message='INVALID_HISTORY_LIMIT'; end if;
  -- Auth ownership is checked independently of the CURRENT expected context.
  -- Neither actor/beneficiary IDs nor a legacy user_id narrow shared history.
  select p.* into v_period from public.relationship_periods p
    join public.relationship_period_members own on own.relationship_id=p.id and own.user_id=v_actor
    where p.id=p_retained_relationship_id;
  if v_period.id is null then raise exception using errcode='42501',message='RETAINED_PERIOD_NOT_FOUND'; end if;
  if v_period.status<>'archived' or v_period.id=p_expected_relationship_id then
    raise exception using errcode='42501',message='RETAINED_PERIOD_NOT_ARCHIVED'; end if;

  -- A cursor is a location, never authority. Binding rejects reuse across
  -- accounts/domains/connection generations; every page rechecks membership.
  -- The digest contains no reversible Auth or participant identifiers.
  v_binding:=encode(extensions.digest(concat_ws(':','retained-history-v1',v_actor,p_expected_relationship_id,
    p_expected_relationship_session_id,p_retained_relationship_id,v_period.relationship_session_id,p_domain),'sha256'),'hex');
  if p_cursor is not null then
    begin
      if length(p_cursor)>2048 then raise exception 'invalid'; end if;
      v_cursor:=convert_from(decode(p_cursor,'base64'),'UTF8')::jsonb;
      if jsonb_typeof(v_cursor)<>'object' or v_cursor->>'v' is distinct from '1'
        or v_cursor->>'binding' is distinct from v_binding
        or (select count(*) from jsonb_object_keys(v_cursor))<>5
        or not (v_cursor ?& array['v','binding','at','source','id'])
        or jsonb_typeof(v_cursor->'at') not in ('string','null')
        or v_cursor->>'source' not in ('native','imported') or v_cursor->>'source' is null
        or jsonb_typeof(v_cursor->'id') is distinct from 'string' then raise exception 'invalid'; end if;
      v_after_at:=(v_cursor->>'at')::timestamptz;
      v_after_source:=v_cursor->>'source'; v_after_id:=(v_cursor->>'id')::uuid;
      if v_after_at is not null and not isfinite(v_after_at) then raise exception 'invalid'; end if;
    exception when others then raise exception using errcode='22023',message='INVALID_HISTORY_CURSOR'; end;
  end if;

  for r in
    with candidates as (
      select e.id,e.recorded_at as at,'native'::text as source,e.kind,
        case when jsonb_typeof(e.subject->'title')='string' then e.subject->>'title' else null end as title,
        case when jsonb_typeof(e.subject->'title')='string' then 'recorded_snapshot' else 'unavailable' end as title_basis,
        case when e.subject->>'role' in ('dom','sub') then e.subject->>'role' else null end as role,
        e.actor_participant_id as actor,e.beneficiary_participant_id as beneficiary,
        e.calendar,e.reverses_event_id,e.provenance,null::jsonb as legacy
      from public.action_events e where e.relationship_id=p_retained_relationship_id
        and ((p_domain='task' and e.task_id is not null) or (p_domain='reward' and e.reward_id is not null)
          or (p_domain='rule' and e.rule_id is not null) or (p_domain='punishment' and e.punishment_id is not null))
      union all
      select h.id,h.completed_at,'imported','task_completed',d.title,
        case when d.title is null then 'unavailable' else 'current_reference' end,
        null,null::uuid,null::uuid,null::jsonb,null::uuid,'legacy_record','{}'::jsonb
      from public.task_completion_history h left join public.tasks d on d.id=h.task_id and d.relationship_id=h.relationship_id
      where p_domain='task' and h.relationship_id=p_retained_relationship_id and h.action_event_id is null
      union all
      select h.id,h.created_at,'imported','reward_use_record',d.title,
        case when d.title is null then 'unavailable' else 'current_reference' end,
        null,null::uuid,null::uuid,null::jsonb,null::uuid,'legacy_record',jsonb_build_object('used',h.used,'dayOfWeek',h.day_of_week,'weekNumber',h.week_number)
      from public.reward_usage h left join public.rewards d on d.id=h.reward_id and d.relationship_id=h.relationship_id
      where p_domain='reward' and h.relationship_id=p_retained_relationship_id and h.action_event_id is null
      union all
      select h.id,h.violation_date,'imported','rule_violated',d.title,
        case when d.title is null then 'unavailable' else 'current_reference' end,
        null,null::uuid,null::uuid,null::jsonb,null::uuid,'legacy_record',jsonb_build_object('dayOfWeek',h.day_of_week,'weekNumber',h.week_number)
      from public.rule_violations h left join public.rules d on d.id=h.rule_id and d.relationship_id=h.relationship_id
      where p_domain='rule' and h.relationship_id=p_retained_relationship_id and h.action_event_id is null
      union all
      select h.id,h.applied_date,'imported','punishment_applied',d.title,
        case when d.title is null then 'unavailable' else 'current_reference' end,
        null,null::uuid,null::uuid,null::jsonb,null::uuid,'legacy_record',jsonb_build_object('dayOfWeek',h.day_of_week,'pointsDeducted',h.points_deducted)
      from public.punishment_history h left join public.punishments d on d.id=h.punishment_id and d.relationship_id=h.relationship_id
      where p_domain='punishment' and h.relationship_id=p_retained_relationship_id and h.action_event_id is null
    )
    select * from candidates c where p_cursor is null
      or (v_after_at is not null and (c.at<v_after_at or c.at is null))
      or (c.at is not distinct from v_after_at and (c.source,c.id)<(v_after_source,v_after_id))
    order by c.at desc nulls last,c.source desc,c.id desc limit p_limit+1
  loop
    v_count:=v_count+1;
    if v_count>p_limit then
      v_next:=replace(encode(convert_to(v_last::text,'UTF8'),'base64'),E'\n',''); exit;
    end if;
    v_points:=null;
    if r.source='native' then
      select coalesce(jsonb_agg(jsonb_build_object('person',public._retained_activity_person(v_actor,p_retained_relationship_id,p.participant_id),
        'currency',p.currency,'amount',p.amount,'calendar',public._retained_activity_calendar(p.calendar))
        order by p.currency,p.id),'[]'::jsonb) into v_points
      from public.action_point_entries p where p.relationship_id=p_retained_relationship_id and p.event_id=r.id;
    end if;
    v_rows:=v_rows||jsonb_build_array(jsonb_build_object('key',r.source||':'||r.id::text,'source',r.source,'kind',r.kind,'timestamp',r.at,
      'title',jsonb_build_object('text',r.title,'basis',r.title_basis),'role',r.role,
      'actor',public._retained_activity_person(v_actor,p_retained_relationship_id,r.actor),
      'beneficiary',public._retained_activity_person(v_actor,p_retained_relationship_id,r.beneficiary),
      'calendar',public._retained_activity_calendar(r.calendar),'pointEffects',v_points,
      'reversesKey',case when r.reverses_event_id is not null and exists(select 1 from public.action_events e
        where e.id=r.reverses_event_id and e.relationship_id=p_retained_relationship_id
          and ((p_domain='task' and e.task_id is not null) or (p_domain='reward' and e.reward_id is not null)
            or (p_domain='rule' and e.rule_id is not null) or (p_domain='punishment' and e.punishment_id is not null)))
        then 'native:'||r.reverses_event_id::text else null end,
      'provenance',r.provenance,'legacy',r.legacy));
    v_last:=jsonb_build_object('v',1,'binding',v_binding,'at',r.at,'source',r.source,'id',r.id);
  end loop;
  return jsonb_build_object('scope',jsonb_build_object('currentPeriodId',p_expected_relationship_id,'currentSessionId',p_expected_relationship_session_id,
    'retainedPeriodId',p_retained_relationship_id,'domain',p_domain),'rows',v_rows,'nextCursor',v_next);
end $$;

revoke all on function public._retained_activity_require_scope(uuid,uuid),public._retained_activity_person(uuid,uuid,uuid),
  public._retained_activity_calendar(jsonb),public.list_my_retained_activity_periods(uuid,uuid),
  public.get_my_retained_activity_history(uuid,uuid,uuid,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.list_my_retained_activity_periods(uuid,uuid),
  public.get_my_retained_activity_history(uuid,uuid,uuid,text,text,integer) to authenticated;
comment on function public.get_my_retained_activity_history(uuid,uuid,uuid,text,text,integer) is
  'Read-only original-member history: all shared events and deltas, masked former identity, original imported facts, no live balances or mutation capability.';
notify pgrst,'reload schema';
commit;
