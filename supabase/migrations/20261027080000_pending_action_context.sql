-- A pending action is a reviewed intention, not permission to apply a later
-- definition or calendar. No existing rows, receipts or activation gates change.
begin;

-- Strict, bounded wire values. Calendar values are assertions to compare with
-- the server clock; they are never used to backdate an event.
create function public._actions_context_calendar_valid(p_calendar jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare v_date date; v_week date; v_keys text[];
begin
  if jsonb_typeof(p_calendar) is distinct from 'object' then return false; end if;
  select array_agg(k order by k) into v_keys from jsonb_object_keys(p_calendar) k;
  if v_keys is distinct from array['localDate','participantId','timeZone','weekStartDate'] then return false; end if;
  if jsonb_typeof(p_calendar->'participantId') is distinct from 'string' or
    (p_calendar->>'participantId')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
    jsonb_typeof(p_calendar->'timeZone') is distinct from 'string' or length(p_calendar->>'timeZone') not between 1 and 255 or
    jsonb_typeof(p_calendar->'localDate') is distinct from 'string' or (p_calendar->>'localDate')!~'^\d{4}-\d{2}-\d{2}$' or
    jsonb_typeof(p_calendar->'weekStartDate') is distinct from 'string' or (p_calendar->>'weekStartDate')!~'^\d{4}-\d{2}-\d{2}$' then return false; end if;
  begin
    v_date:=(p_calendar->>'localDate')::date; v_week:=(p_calendar->>'weekStartDate')::date;
  exception when invalid_datetime_format or datetime_field_overflow then return false;
  end;
  return extract(isodow from v_week)=1 and v_date-v_week between 0 and 6;
end $$;

create function public._actions_context_integer_valid(p_value jsonb,p_min integer) returns boolean
language sql immutable set search_path='' as $$
  select case when jsonb_typeof(p_value)='number' and p_value::text~'^[0-9]+$'
    then p_value::text::numeric between p_min and 2147483647 else false end;
$$;

create function public._actions_require_expected_context(p_expected jsonb,p_current jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare v_kind text:=p_current->>'kind'; v_keys text[]; v_expected_keys text[];
  v_calendars text[]; v_key text; v_e jsonb; v_c jsonb; v_fields text[];
begin
  if p_expected is null then raise exception using errcode='22023',message='ACTION_CONTEXT_REQUIRED'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' then
    raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  v_expected_keys:=case v_kind
    when 'task_complete' then array['beneficiaryParticipantId','currency','frequency','kind','localDate','points','subjectId','target','timeZone','version','weekStartDate']
    when 'rule_violation' then array['kind','sub','subjectId','version']
    when 'punishment_apply' then array['dom','domAward','kind','sub','subDeduction','subjectId','version'] end;
  select array_agg(k order by k) into v_keys from jsonb_object_keys(p_expected) k;
  if v_expected_keys is null or v_keys is distinct from v_expected_keys or
    p_expected->'version' is distinct from '1'::jsonb or p_expected->'kind' is distinct from p_current->'kind' or
    p_expected->'subjectId' is distinct from p_current->'subjectId' then
    raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  if v_kind='task_complete' then
    if p_expected->>'currency' not in('dom','sub') or jsonb_typeof(p_expected->'currency') is distinct from 'string' or
      p_expected->>'frequency' not in('daily','weekly') or jsonb_typeof(p_expected->'frequency') is distinct from 'string' or
      not public._actions_context_integer_valid(p_expected->'points',0) or not public._actions_context_integer_valid(p_expected->'target',1) or
      not public._actions_context_calendar_valid(jsonb_build_object('participantId',p_expected->'beneficiaryParticipantId',
        'timeZone',p_expected->'timeZone','localDate',p_expected->'localDate','weekStartDate',p_expected->'weekStartDate')) then
      raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  else
    if not public._actions_context_calendar_valid(p_expected->'sub') then
      raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
    if v_kind='punishment_apply' and (
      not public._actions_context_integer_valid(p_expected->'subDeduction',0) or
      not public._actions_context_integer_valid(p_expected->'domAward',0) or
      (p_expected->'dom' is distinct from 'null'::jsonb and not public._actions_context_calendar_valid(p_expected->'dom')) or
      (p_expected->'domAward'='0'::jsonb and p_expected->'dom' is distinct from 'null'::jsonb)) then
      raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  end if;
  -- Deterministic precedence: beneficiary, definition, timezone, then date.
  if v_kind='task_complete' then
    if p_expected->'beneficiaryParticipantId' is distinct from p_current->'beneficiaryParticipantId' or
      p_expected->'currency' is distinct from p_current->'currency' then
      raise exception using errcode='22023',message='ACTION_BENEFICIARY_CHANGED',detail='beneficiaryParticipantId,currency'; end if;
    v_fields:=array['points','frequency','target']; v_calendars:=array['task'];
  else
    if p_expected#>'{sub,participantId}' is distinct from p_current#>'{sub,participantId}' or
      (v_kind='punishment_apply' and p_expected#>'{dom,participantId}' is distinct from p_current#>'{dom,participantId}') then
      raise exception using errcode='22023',message='ACTION_BENEFICIARY_CHANGED',detail='sub.participantId,dom.participantId'; end if;
    v_fields:=case when v_kind='punishment_apply' then array['subDeduction','domAward'] else array[]::text[] end;
    v_calendars:=case when v_kind='punishment_apply' and p_current->'dom'<>'null'::jsonb then array['sub','dom'] else array['sub'] end;
  end if;
  foreach v_key in array v_fields loop
    if p_expected->v_key is distinct from p_current->v_key then
      raise exception using errcode='22023',message='ACTION_DEFINITION_CHANGED',detail=v_key; end if;
  end loop;
  foreach v_key in array v_calendars loop
    v_e:=case when v_key='task' then p_expected else p_expected->v_key end;
    v_c:=case when v_key='task' then p_current else p_current->v_key end;
    if v_e->'timeZone' is distinct from v_c->'timeZone' then
      raise exception using errcode='22023',message='ACTION_TIMEZONE_CHANGED',detail=v_key||'.timeZone'; end if;
  end loop;
  foreach v_key in array v_calendars loop
    v_e:=case when v_key='task' then p_expected else p_expected->v_key end;
    v_c:=case when v_key='task' then p_current else p_current->v_key end;
    if v_e->'localDate' is distinct from v_c->'localDate' or v_e->'weekStartDate' is distinct from v_c->'weekStartDate' then
      raise exception using errcode='22023',message='ACTION_DATE_CHANGED',detail=v_key||'.localDate,weekStartDate'; end if;
  end loop;
end $$;

-- Read contexts use the same selected definition and saved clocks as
-- displayed progress; participant IDs are never raw Auth IDs.
create or replace function public._actions_task_progress(p_period uuid,p_task uuid,p_at timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v_task public.tasks%rowtype; v_participant uuid; v_timezone text; v_date date; v_monday date;
  v_open public.action_task_openings%rowtype; v_marks integer[]:=array[0,0,0,0,0,0,0];
  v_i integer; v_count integer; v_latest date; v_role text;
begin
  select * into v_task from public.tasks where id=p_task and relationship_id=p_period;
  if not found then raise exception using errcode='22023',message='TASK_NOT_FOUND'; end if;
  v_role:=case when v_task.is_dom_task then 'dom' else 'sub' end;
  select m.participant_id,p.timezone into v_participant,v_timezone from public.relationship_period_members m join public.profiles p on p.id=m.user_id
    where m.relationship_id=p_period and m.role=v_role;
  if v_participant is null then raise exception using errcode='22023',message='TASK_OWNER_MISSING'; end if;
  if v_timezone is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
  if v_task.frequency not in ('daily','weekly') or v_task.frequency is null or v_task.frequency_count is null or v_task.frequency_count<1 or v_task.points is null or v_task.points<0 then
    raise exception using errcode='22023',message='INVALID_TASK_DEFINITION';
  end if;
  v_date:=(p_at at time zone v_timezone)::date;
  v_monday:=v_date-(extract(isodow from v_date)::integer-1);
  select * into v_open from public.action_task_openings where relationship_id=p_period and task_id=p_task;
  for v_i in 0..6 loop
    select count(*)::integer into v_count from public.action_events e where e.relationship_id=p_period and e.task_id=p_task and e.kind='task_completed'
      and (e.calendar->>'localDate')::date=v_monday+v_i
      and not exists(select 1 from public.action_events r where r.reverses_event_id=e.id);
    v_marks[v_i+1]:=v_count+case when v_open.week_start_date=v_monday then (v_open.usage_data->>v_i)::integer else 0 end;
  end loop;
  if v_task.frequency='daily' then v_count:=v_marks[extract(isodow from v_date)::integer];
  else select sum(x)::integer into v_count from unnest(v_marks) x; end if;
  select max(v_monday+d) into v_latest from generate_series(0,6) d where v_marks[d+1]>0 and
    (v_task.frequency='weekly' or v_monday+d=v_date);
  return jsonb_build_object('taskId',p_task,'beneficiaryParticipantId',v_participant,'currency',v_role,'timeZone',v_timezone,
    'localDate',v_date,'weekStartDate',v_monday,'weekIdentifier',to_char(v_date,'IYYY-"W"IW'),
    'frequency',v_task.frequency,'target',v_task.frequency_count,'currentCount',v_count,'usageData',to_jsonb(v_marks),
    'completed',v_count>=v_task.frequency_count,'lastCompletedDate',v_latest,'deleted',v_task.deleted_at is not null,
    'expectedContext',jsonb_build_object('version',1,'kind','task_complete','subjectId',p_task,
      'beneficiaryParticipantId',v_participant,'currency',v_role,'points',v_task.points,'frequency',v_task.frequency,
      'target',v_task.frequency_count,'timeZone',v_timezone,'localDate',v_date,'weekStartDate',v_monday));
end $$;

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
  select source_snapshot->'recordingOpening' into v_open from public.action_accounting_periods where relationship_id=p_period;
  if v_open is null then raise exception using errcode='22023',message='RECORDING_NOT_INITIALIZED'; end if;
  select x into v_item from jsonb_array_elements(v_open->'items') x where x->>'subjectType'=p_type and x->>'subjectId'=p_subject::text;
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

-- Reviewed0300/0500 bodies retain receipt-first replay and recorded Undo.
-- Profile row locks serialize timezone writes; definition and identity locks
-- preserve the established order. Context checks and events use one v_at.
create function public._execute_task_with_context(
  p_command_id uuid,p_expected_relationship_id uuid,p_action text,p_task_id uuid default null,p_event_id uuid default null,p_expected_context jsonb default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_period uuid; v_actor uuid; v_role text; v_task public.tasks%rowtype;
  v_original public.action_events%rowtype; v_old public.action_command_receipts%rowtype;
  v_payload jsonb; v_progress jsonb; v_calendar jsonb; v_subject jsonb; v_values jsonb;
  v_owner uuid; v_owner_user uuid; v_currency text; v_event uuid; v_at timestamptz; v_delta integer;
  v_entry record; v_receipt jsonb; v_feedback jsonb; v_progress_error text;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_command_id is null or p_expected_relationship_id is null or p_action is null or p_action not in ('task_complete','undo') or
     (p_action='task_complete' and (p_task_id is null or p_event_id is not null)) or
     (p_action='undo' and (p_event_id is null or p_task_id is not null)) then
    raise exception using errcode='22023',message='INVALID_ACTION_COMMAND';
  end if;
  perform public._identity_lock();
  v_period:=public.current_relationship_id();
  if v_period is null or v_period<>p_expected_relationship_id then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then raise exception using errcode='42501',message='ACCOUNTING_NOT_ENABLED'; end if;
  perform 1 from public.profiles p join public.relationship_period_members m on m.user_id=p.id
    where m.relationship_id=v_period order by p.id for update of p;
  select participant_id,role into strict v_actor,v_role from public.relationship_period_members where relationship_id=v_period and user_id=v_user;
  if p_action='task_complete' and p_expected_context is null then
    raise exception using errcode='22023',message='ACTION_CONTEXT_REQUIRED'; end if;
  if p_action='undo' and p_expected_context is not null then
    raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  v_payload:=jsonb_build_object('relationshipId',p_expected_relationship_id,'kind',p_action,'taskId',p_task_id,'eventId',p_event_id)
    ||case when p_action='task_complete' then jsonb_build_object('expectedContext',p_expected_context) else '{}'::jsonb end;
  select * into v_old from public.action_command_receipts where command_id=p_command_id;
  if found then
    if v_old.actor_user_id is distinct from v_user then raise exception using errcode='42501',message='COMMAND_ACTOR_MISMATCH'; end if;
    if v_old.payload<>v_payload then raise exception using errcode='22023',message='COMMAND_ID_REUSED'; end if;
    return v_old.receipt;
  end if;
  if p_action='task_complete' then
    perform public._actions_require_permission(v_period,v_role,'task_complete');
    select * into v_task from public.tasks where id=p_task_id and relationship_id=v_period for update;
  else
    perform public._actions_require_permission(v_period,v_role,'task_undo');
    select * into v_original from public.action_events where id=p_event_id and relationship_id=v_period and kind='task_completed' and provenance='command';
    if not found then raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE'; end if;
    if exists(select 1 from public.action_events where reverses_event_id=p_event_id) then raise exception using errcode='22023',message='ACTION_ALREADY_UNDONE'; end if;
    select * into v_task from public.tasks where id=v_original.task_id and relationship_id=v_period for update;
  end if;
  if v_task.id is null then raise exception using errcode='22023',message='TASK_NOT_FOUND'; end if;
  v_at:=clock_timestamp();
  if p_action='task_complete' then
    if v_task.deleted_at is not null then raise exception using errcode='22023',message='TASK_DELETED'; end if;
    v_progress:=public._actions_task_progress(v_period,v_task.id,v_at);
    perform public._actions_require_expected_context(p_expected_context,v_progress->'expectedContext');
    if (v_progress->>'currentCount')::integer>=v_task.frequency_count then raise exception using errcode='22023',message='TASK_TARGET_REACHED'; end if;
    v_owner:=(v_progress->>'beneficiaryParticipantId')::uuid; v_currency:=v_progress->>'currency';
    select user_id into v_owner_user from public.relationship_period_members where participant_id=v_owner and relationship_id=v_period;
    v_delta:=v_task.points;
    v_calendar:=jsonb_build_object('participantId',v_owner,'timeZone',v_progress->>'timeZone','localDate',v_progress->>'localDate','weekStartDate',v_progress->>'weekStartDate');
    v_subject:=jsonb_build_object('type','task','id',v_task.id,'title',v_task.title,'role',v_currency);
    v_values:=jsonb_build_object('type','task','points',v_task.points,'frequency',v_task.frequency,'target',v_task.frequency_count);
  else
    v_owner:=v_original.beneficiary_participant_id; v_currency:=v_original.subject->>'role';
    v_calendar:=v_original.calendar; v_subject:=v_original.subject; v_values:=v_original.definition_values;
    if not exists(select 1 from public.relationship_period_members where relationship_id=v_period and participant_id=v_owner and role=v_currency) then
      raise exception using errcode='42501',message='ORIGINAL_BENEFICIARY_REQUIRED';
    end if;
  end if;
  insert into public.action_events(relationship_id,command_id,kind,actor_participant_id,beneficiary_participant_id,task_id,
    subject,definition_values,calendar,intent,provenance,reverses_event_id,recorded_at)
    values(v_period,p_command_id,case when p_action='task_complete' then 'task_completed' else 'action_undone' end,v_actor,v_owner,v_task.id,
      v_subject,v_values,v_calendar,v_payload,'command',case when p_action='undo' then p_event_id end,v_at) returning id into v_event;
  if p_action='task_complete' then
    perform public._actions_wallet_delta(v_event,v_period,v_owner,v_currency,v_delta,'task_award');
    insert into public.task_completion_history(task_id,user_id,relationship_id,completed_at,action_event_id)
      values(v_task.id,v_owner_user,v_period,v_at,v_event);
  else
    -- Reverse recorded ledger entries, never today's edited task price or target.
    for v_entry in select * from public.action_point_entries where event_id=p_event_id loop
      if v_entry.reason<>'task_award' or v_entry.participant_id<>v_owner or v_entry.currency<>v_currency then
        raise exception using errcode='22023',message='INVALID_ORIGINAL_TASK_AWARD';
      end if;
      perform public._actions_wallet_delta(v_event,v_period,v_entry.participant_id,v_entry.currency,-v_entry.amount,'task_undo');
    end loop;
    if not found then raise exception using errcode='22023',message='ORIGINAL_TASK_AWARD_MISSING'; end if;
    -- Compatibility active-event projection only; original event + reversal stay.
    delete from public.task_completion_history where action_event_id=p_event_id;
  end if;
  begin
    v_progress:=public._actions_task_progress(v_period,v_task.id,v_at);
  exception when sqlstate '22023' then
    get stacked diagnostics v_progress_error=MESSAGE_TEXT;
    -- Correction depends on the recorded beneficiary, not a newly edited task
    -- whose future owner or timezone is currently unavailable.
    if p_action='undo' and v_progress_error in ('TASK_OWNER_MISSING','TIMEZONE_REQUIRED','INVALID_TASK_DEFINITION') then v_progress:=null;
    else raise; end if;
  end;
  v_feedback:=jsonb_build_object('eventId',v_event,'recipientParticipantId',v_owner,'subjectTitle',v_subject->>'title','kind','action_confirmed');
  insert into public.action_feedback_outbox values(v_event,v_owner,v_period,'action_confirmed',v_feedback);
  select jsonb_build_object('commandId',p_command_id,'relationshipId',v_period,'eventIds',jsonb_build_array(v_event),'confirmedAt',clock_timestamp(),
    'balances',(select jsonb_agg(jsonb_build_object('participantId',participant_id,'currency',currency,'balance',balance) order by currency) from public.action_wallets where relationship_id=v_period),
    'pointDeltas',(select jsonb_agg(jsonb_build_object('participantId',participant_id,'currency',currency,'amount',amount) order by currency) from public.action_point_entries where event_id=v_event),
    'availableRewardQuantities','[]'::jsonb,'refunds','[]'::jsonb,'feedback',jsonb_build_array(v_feedback),'taskProgress',v_progress) into v_receipt;
  insert into public.action_command_receipts(actor_user_id,actor_participant_id,command_id,relationship_id,payload,receipt)
    values(v_user,v_actor,p_command_id,v_period,v_payload,v_receipt);
  return v_receipt;
end $$;

create function public._execute_recording_with_context(
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
    if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and source_snapshot ? 'recordingOpening') then
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


-- Replace public signatures rather than leaving a context-free overload.
-- Undo's existing positional call uses the default NULL context, and its payload
-- and recorded deltas/calendar remain unchanged. Old pending forward commands
-- without context may only use get_my_action_receipt; nothing is inferred here.
drop function public.execute_task_command(uuid,uuid,text,uuid,uuid,uuid);
drop function public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid,uuid);

create function public.execute_task_command(p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_task_id uuid default null,p_event_id uuid default null,p_expected_relationship_session_id uuid default null,
  p_expected_context jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._execute_task_with_context(p_command_id,p_expected_relationship_id,p_action,p_task_id,p_event_id,p_expected_context);
  return public.get_my_action_receipt(p_command_id,p_expected_relationship_id);
end $$;

create function public.execute_recording_command(p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_rule_id uuid default null,p_punishment_id uuid default null,p_event_id uuid default null,
  p_expected_relationship_session_id uuid default null,p_expected_context jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._execute_recording_with_context(p_command_id,p_expected_relationship_id,p_action,p_rule_id,p_punishment_id,p_event_id,p_expected_context);
  return public.get_my_action_receipt(p_command_id,p_expected_relationship_id);
end $$;


revoke all on function public._actions_context_calendar_valid(jsonb),public._actions_context_integer_valid(jsonb,integer),
  public._actions_require_expected_context(jsonb,jsonb),public._execute_task_with_context(uuid,uuid,text,uuid,uuid,jsonb),
  public._execute_recording_with_context(uuid,uuid,text,uuid,uuid,uuid,jsonb),
  public.execute_task_command(uuid,uuid,text,uuid,uuid,uuid,jsonb),
  public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid,uuid,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.execute_task_command(uuid,uuid,text,uuid,uuid,uuid,jsonb),
  public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
