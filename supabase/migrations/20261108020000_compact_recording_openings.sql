-- Keep the original activation archive intact; store only its frozen recording counts
-- for hot reads. The generated column follows future activation writes automatically.
begin;
-- A deterministic, private, stored read model of the frozen opening counts.
-- Definitions, history and artwork remain untouched in source_snapshot.
create function public._actions_compact_recording_opening(p_source jsonb) returns jsonb
language sql immutable strict parallel safe set search_path='' as $$
  select case
    when p_source->'recordingOpening' is null then null
    when p_source->'recordingOpening'='null'::jsonb then 'null'::jsonb
    else jsonb_build_object(
      'weekStartDate',p_source#>'{recordingOpening,weekStartDate}',
      'items',coalesce((
        select jsonb_agg(jsonb_build_object('subjectType',x."subjectType",'subjectId',x."subjectId",'usageData',x."usageData") order by x.position)
        from rows from (jsonb_to_recordset(p_source#>'{recordingOpening,items}')
          as ("subjectType" text,"subjectId" text,"usageData" jsonb)) with ordinality
          as x("subjectType","subjectId","usageData",position)
      ),'[]'::jsonb)
    )
  end
$$;
revoke all on function public._actions_compact_recording_opening(jsonb) from public,anon,authenticated;
grant execute on function public._actions_compact_recording_opening(jsonb) to service_role;

alter table public.action_accounting_periods add column recording_opening_usage jsonb
  generated always as (public._actions_compact_recording_opening(source_snapshot)) stored;
-- No client grant: authenticated keeps its existing two-column visibility.

create or replace function public._actions_recording_progress(p_period uuid,p_type text,p_subject uuid,p_at timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v_sub uuid; v_dom uuid; v_deleted boolean; v_calendar jsonb; v_dom_calendar jsonb; v_context jsonb;
  v_deduction integer; v_award integer; v_open jsonb; v_item jsonb;
  v_monday date; v_marks integer[]:=array[0,0,0,0,0,0,0]; v_i integer; v_count integer;
begin
  if p_type='rule' then select deleted_at is not null into v_deleted from public.rules where id=p_subject and relationship_id=p_period;
  elsif p_type='punishment' then select deleted_at is not null,points,dom_points into v_deleted,v_deduction,v_award from public.punishments where id=p_subject and relationship_id=p_period;
  else raise exception using errcode='22023',message='INVALID_RECORDING_SUBJECT'; end if;
  if not found then raise exception using errcode='22023',message='RECORDING_SUBJECT_NOT_FOUND'; end if;
  select participant_id into v_sub from public.relationship_period_members where relationship_id=p_period and role='sub';
  if v_sub is null then raise exception using errcode='22023',message='SUB_PARTICIPANT_REQUIRED'; end if;
  v_calendar:=public._actions_recording_calendar(p_period,v_sub,p_at); v_monday:=(v_calendar->>'weekStartDate')::date;
  if p_type='punishment' then
    if v_deduction is null or v_deduction<0 or v_award is null or v_award<0 then
      raise exception using errcode='22023',message='INVALID_PUNISHMENT_DEFINITION'; end if;
    if v_award>0 then
      select participant_id into v_dom from public.relationship_period_members where relationship_id=p_period and role='dom';
      if v_dom is not null then v_dom_calendar:=public._actions_recording_calendar(p_period,v_dom,p_at); end if;
    end if;
    v_context:=jsonb_build_object('version',1,'kind','punishment_apply','subjectId',p_subject,
      'subDeduction',v_deduction,'domAward',v_award,'sub',v_calendar,'dom',v_dom_calendar);
  else
    v_context:=jsonb_build_object('version',1,'kind','rule_violation','subjectId',p_subject,'sub',v_calendar);
  end if;
  select recording_opening_usage into v_open from public.action_accounting_periods where relationship_id=p_period;
  if v_open is null then raise exception using errcode='22023',message='RECORDING_NOT_INITIALIZED'; end if;
  select jsonb_build_object('usageData',x."usageData") into v_item
    from jsonb_to_recordset(v_open->'items') as x("subjectType" text,"subjectId" text,"usageData" jsonb)
    where x."subjectType"=p_type and x."subjectId"=p_subject::text;
  for v_i in 0..6 loop
    select count(*)::integer into v_count from public.action_events e where e.relationship_id=p_period and
      ((p_type='rule' and e.rule_id=p_subject and e.kind='rule_violated') or
       (p_type='punishment' and e.punishment_id=p_subject and e.kind='punishment_applied')) and
      (e.calendar->>'localDate')::date=v_monday+v_i and not exists(select 1 from public.action_events r where r.reverses_event_id=e.id);
    v_marks[v_i+1]:=v_count+case when (v_open->>'weekStartDate')::date=v_monday then coalesce((v_item->'usageData'->>v_i)::integer,0) else 0 end;
  end loop;
  return jsonb_build_object('subjectType',p_type,'subjectId',p_subject,'beneficiaryParticipantId',v_sub,
    'timeZone',v_calendar->>'timeZone','localDate',v_calendar->>'localDate','weekStartDate',v_monday,
    'weekIdentifier',to_char((v_calendar->>'localDate')::date,'IYYY-"W"IW'),
    'usageData',to_jsonb(v_marks),'currentCount',(select sum(x) from unnest(v_marks) x),'deleted',v_deleted,'expectedContext',v_context);
end $$;

create or replace function public._execute_recording_with_context(
  p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_rule_id uuid default null,p_punishment_id uuid default null,p_event_id uuid default null,p_expected_context jsonb default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_period uuid; v_actor uuid; v_role text; v_sub uuid; v_sub_user uuid; v_dom uuid;
  v_rule public.rules%rowtype; v_punishment public.punishments%rowtype; v_original public.action_events%rowtype;
  v_old public.action_command_receipts%rowtype; v_payload jsonb; v_event uuid; v_kind text; v_type text; v_id uuid;
  v_at timestamptz; v_calendar jsonb; v_dom_calendar jsonb; v_subject jsonb; v_values jsonb; v_progress jsonb;
  v_balance integer; v_deduction integer; v_entry record; v_sub_entries integer:=0; v_dom_entries integer:=0;
  v_receipt jsonb; v_recipient uuid; v_error text;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_command_id is null or p_expected_relationship_id is null or p_action is null or
     p_action not in ('rule_violation','punishment_apply','undo') or
     (p_action='rule_violation' and (p_rule_id is null or p_punishment_id is not null or p_event_id is not null)) or
     (p_action='punishment_apply' and (p_punishment_id is null or p_rule_id is not null or p_event_id is not null)) or
     (p_action='undo' and (p_event_id is null or p_rule_id is not null or p_punishment_id is not null)) then
    raise exception using errcode='22023',message='INVALID_ACTION_COMMAND';
  end if;
  perform public._identity_lock();
  v_period:=public.current_relationship_id();
  if v_period is null or v_period<>p_expected_relationship_id then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then
    raise exception using errcode='42501',message='ACCOUNTING_NOT_ENABLED';
  end if;
  perform 1 from public.profiles p join public.relationship_period_members m on m.user_id=p.id
    where m.relationship_id=v_period order by p.id for update of p;
  select participant_id,role into strict v_actor,v_role from public.relationship_period_members where relationship_id=v_period and user_id=v_user;
  if p_action<>'undo' and p_expected_context is null then
    raise exception using errcode='22023',message='ACTION_CONTEXT_REQUIRED'; end if;
  if p_action='undo' and p_expected_context is not null then
    raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  v_payload:=jsonb_build_object('relationshipId',p_expected_relationship_id,'kind',p_action,'ruleId',p_rule_id,'punishmentId',p_punishment_id,'eventId',p_event_id)
    ||case when p_action<>'undo' then jsonb_build_object('expectedContext',p_expected_context) else '{}'::jsonb end;
  select * into v_old from public.action_command_receipts where command_id=p_command_id;
  if found then
    if v_old.actor_user_id is distinct from v_user then raise exception using errcode='42501',message='COMMAND_ACTOR_MISMATCH'; end if;
    if v_old.payload<>v_payload then raise exception using errcode='22023',message='COMMAND_ID_REUSED'; end if;
    return v_old.receipt;
  end if;
  if p_action='undo' then
    select * into v_original from public.action_events where id=p_event_id and relationship_id=v_period
      and kind in ('rule_violated','punishment_applied') and provenance='command';
    if not found then raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE'; end if;
    if exists(select 1 from public.action_events where reverses_event_id=p_event_id) then raise exception using errcode='22023',message='ACTION_ALREADY_UNDONE'; end if;
    v_kind:=v_original.kind;
    perform public._actions_require_permission(v_period,v_role,case when v_kind='rule_violated' then 'rule_violation_undo' else 'punishment_undo' end);
    v_sub:=v_original.beneficiary_participant_id;
    if not exists(select 1 from public.relationship_period_members where participant_id=v_sub and relationship_id=v_period and role='sub') then
      raise exception using errcode='42501',message='ORIGINAL_BENEFICIARY_REQUIRED';
    end if;
    v_calendar:=v_original.calendar; v_subject:=v_original.subject; v_values:=v_original.definition_values;
  else
    v_kind:=case when p_action='rule_violation' then 'rule_violated' else 'punishment_applied' end;
    perform public._actions_require_permission(v_period,v_role,p_action);
    select participant_id,user_id into v_sub,v_sub_user from public.relationship_period_members where relationship_id=v_period and role='sub';
    if v_sub is null then raise exception using errcode='22023',message='SUB_PARTICIPANT_REQUIRED'; end if;
    select participant_id into v_dom from public.relationship_period_members where relationship_id=v_period and role='dom';
    if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and recording_opening_usage is not null) then
      raise exception using errcode='22023',message='RECORDING_NOT_INITIALIZED';
    end if;
  end if;
  v_type:=case when v_kind='rule_violated' then 'rule' else 'punishment' end;
  if v_type='rule' then
    select * into v_rule from public.rules where id=coalesce(p_rule_id,v_original.rule_id) and relationship_id=v_period for update;
    if not found then raise exception using errcode='22023',message='RECORDING_SUBJECT_NOT_FOUND'; end if;
    v_id:=v_rule.id;
    if p_action<>'undo' and v_rule.deleted_at is not null then raise exception using errcode='22023',message='DEFINITION_DELETED'; end if;
  else
    select * into v_punishment from public.punishments where id=coalesce(p_punishment_id,v_original.punishment_id) and relationship_id=v_period for update;
    if not found then raise exception using errcode='22023',message='RECORDING_SUBJECT_NOT_FOUND'; end if;
    v_id:=v_punishment.id;
    if p_action<>'undo' and v_punishment.deleted_at is not null then raise exception using errcode='22023',message='DEFINITION_DELETED'; end if;
  end if;
  -- Profiles/timezones and the definition are locked before this single clock.
  -- The same v_at drives comparison, both point calendars and recorded_at.
  v_at:=clock_timestamp();
  if p_action<>'undo' then
    v_progress:=public._actions_recording_progress(v_period,v_type,v_id,v_at);
    perform public._actions_require_expected_context(p_expected_context,v_progress->'expectedContext');
    v_calendar:=public._actions_recording_calendar(v_period,v_sub,v_at);
    v_subject:=jsonb_build_object('type',v_type,'id',v_id,'title',case when v_type='rule' then v_rule.title else v_punishment.title end,'role','sub');
    if v_type='punishment' then
      if v_punishment.points is null or v_punishment.points<0 or v_punishment.dom_points is null or v_punishment.dom_points<0 then
        raise exception using errcode='22023',message='INVALID_PUNISHMENT_DEFINITION';
      end if;
      select balance into strict v_balance from public.action_wallets where relationship_id=v_period and participant_id=v_sub and currency='sub';
      v_deduction:=least(greatest(v_balance,0),v_punishment.points);
      if v_dom is not null and v_punishment.dom_points>0 then
        v_dom_calendar:=public._actions_recording_calendar(v_period,v_dom,v_at);
      end if;
      v_values:=jsonb_build_object('type','punishment','subDeduction',v_punishment.points,'domAward',v_punishment.dom_points,
        'domAwardParticipantId',case when v_dom is not null and v_punishment.dom_points>0 then v_dom end,
        'domAwardOmittedReason',case when v_dom is null then 'dom_participant_absent' when v_punishment.dom_points=0 then 'zero_configured_award' end);
    end if;
  end if;
  insert into public.action_events(relationship_id,command_id,kind,actor_participant_id,beneficiary_participant_id,rule_id,punishment_id,
    subject,definition_values,calendar,intent,provenance,reverses_event_id,recorded_at)
    values(v_period,p_command_id,case when p_action='undo' then 'action_undone' else v_kind end,v_actor,v_sub,
      case when v_type='rule' then v_id end,case when v_type='punishment' then v_id end,
      v_subject,v_values,v_calendar,v_payload,'command',case when p_action='undo' then p_event_id end,v_at) returning id into v_event;
  if p_action='rule_violation' then
    insert into public.rule_violations(rule_id,user_id,relationship_id,violation_date,day_of_week,week_number,action_event_id)
      values(v_id,v_sub_user,v_period,v_at,extract(isodow from (v_calendar->>'localDate')::date)::integer-1,
        to_char((v_calendar->>'localDate')::date,'IYYY-"W"IW'),v_event);
  elsif p_action='punishment_apply' then
    -- Always record the actual Sub delta, even zero. Dom award is independent
    -- of the remaining Sub balance; no percentage, supply or cap is inferred.
    perform public._actions_wallet_delta(v_event,v_period,v_sub,'sub',-v_deduction,'punishment_deduction',v_calendar);
    if v_dom is not null and v_punishment.dom_points>0 then
      perform public._actions_wallet_delta(v_event,v_period,v_dom,'dom',v_punishment.dom_points,'punishment_award',v_dom_calendar);
    end if;
    insert into public.punishment_history(punishment_id,user_id,relationship_id,applied_date,day_of_week,points_deducted,action_event_id)
      values(v_id,v_sub_user,v_period,v_at,extract(isodow from (v_calendar->>'localDate')::date)::integer-1,v_deduction,v_event);
  else
    for v_entry in select * from public.action_point_entries where event_id=p_event_id order by currency loop
      if v_kind<>'punishment_applied' then raise exception using errcode='22023',message='INVALID_ORIGINAL_RECORDING_DELTA'; end if;
      if v_entry.currency='sub' and v_entry.participant_id=v_sub and v_entry.reason='punishment_deduction' and v_entry.amount<=0 then
        v_sub_entries:=v_sub_entries+1;
      elsif v_entry.currency='dom' and v_entry.participant_id=(v_values->>'domAwardParticipantId')::uuid and
        v_entry.reason='punishment_award' and v_entry.amount>0 and v_entry.amount=(v_values->>'domAward')::integer then
        v_dom_entries:=v_dom_entries+1;
      else raise exception using errcode='22023',message='INVALID_ORIGINAL_RECORDING_DELTA'; end if;
      perform public._actions_wallet_delta(v_event,v_period,v_entry.participant_id,v_entry.currency,-v_entry.amount,'punishment_undo',coalesce(v_entry.calendar,v_original.calendar));
    end loop;
    if v_kind='punishment_applied' and (v_sub_entries<>1 or
      v_dom_entries<>case when v_values->>'domAwardParticipantId' is null then 0 else 1 end) then
      raise exception using errcode='22023',message='ORIGINAL_PUNISHMENT_DELTA_MISSING';
    end if;
    -- Active legacy projections only: immutable original + reversal remain.
    if v_type='rule' then delete from public.rule_violations where action_event_id=p_event_id;
    else delete from public.punishment_history where action_event_id=p_event_id; end if;
  end if;
  begin
    v_progress:=public._actions_recording_progress(v_period,v_type,v_id,v_at);
  exception when sqlstate '22023' then
    get stacked diagnostics v_error=MESSAGE_TEXT;
    if p_action='undo' and v_error in ('SUB_PARTICIPANT_REQUIRED','TIMEZONE_REQUIRED','RECORDING_NOT_INITIALIZED','INVALID_PUNISHMENT_DEFINITION') then v_progress:=null;
    else raise; end if;
  end;
  for v_recipient in
    select v_sub union select participant_id from public.action_point_entries where event_id=v_event
  loop
    insert into public.action_feedback_outbox(event_id,recipient_participant_id,relationship_id,kind,payload)
      values(v_event,v_recipient,v_period,'action_confirmed',jsonb_build_object('eventId',v_event,'recipientParticipantId',v_recipient,
        'subjectTitle',v_subject->>'title','kind','action_confirmed'));
  end loop;
  select jsonb_build_object('commandId',p_command_id,'relationshipId',v_period,'eventIds',jsonb_build_array(v_event),'confirmedAt',clock_timestamp(),
    'balances',(select jsonb_agg(jsonb_build_object('participantId',participant_id,'currency',currency,'balance',balance) order by currency) from public.action_wallets where relationship_id=v_period),
    'pointDeltas',coalesce((select jsonb_agg(jsonb_build_object('participantId',participant_id,'currency',currency,'amount',amount) order by currency) from public.action_point_entries where event_id=v_event),'[]'::jsonb),
    'availableRewardQuantities','[]'::jsonb,'refunds','[]'::jsonb,'recordingProgress',v_progress,
    'feedback',(select jsonb_agg(payload order by recipient_participant_id) from public.action_feedback_outbox where event_id=v_event)) into v_receipt;
  insert into public.action_command_receipts(actor_user_id,actor_participant_id,command_id,relationship_id,payload,receipt)
    values(v_user,v_actor,p_command_id,v_period,v_payload,v_receipt);
  return v_receipt;
end $$;

commit;
