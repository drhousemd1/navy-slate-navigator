-- One-time tasks and optional deadlines. Existing tasks gain neutral fields; history and receipts stay unchanged.
-- Late completion earns normal configured points; mandatory is descriptive, never a penalty.
begin;
alter table public.tasks
  add column mandatory boolean not null default false,
  add column deadline_date date,
  add column deadline_time time,
  add column deadline_weekday smallint;

create function public._actions_task_schedule_valid(p_frequency text,p_date date,p_time time,p_weekday smallint)
returns boolean language sql immutable set search_path='' as $$
  select case when p_time is null then p_date is null and p_weekday is null
    else p_time<time '24:00' and extract(second from p_time)=0 and case p_frequency
      when 'once' then p_date between date '0001-01-01' and date '9999-12-31' and p_weekday is null
      when 'daily' then p_date is null and p_weekday is null
      when 'weekly' then p_date is null and p_weekday between 1 and 7
      else false end end is true;
$$;
alter table public.tasks add constraint tasks_deadline_shape check
  (public._actions_task_schedule_valid(frequency,deadline_date,deadline_time,deadline_weekday));
alter table public.tasks add constraint tasks_once_target check (frequency is distinct from 'once' or frequency_count=1);
-- The CHECK helper receives only caller-supplied scalar values and reads no data.
revoke all on function public._actions_task_schedule_valid(text,date,time,smallint) from public;
grant execute on function public._actions_task_schedule_valid(text,date,time,smallint) to anon,authenticated,service_role;

create or replace function public._activate_task_reward_accounting(p_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_task public.tasks%rowtype; v_participant uuid; v_timezone text;
  v_at timestamptz; v_date date; v_monday date; v_marks jsonb; v_history jsonb;
begin
  v_result:=public._activate_reward_accounting(p_relationship_id);
  select activated_at into strict v_at from public.action_accounting_periods where relationship_id=p_relationship_id;
  perform 1 from public.tasks where relationship_id=p_relationship_id order by id for update;
  for v_task in select * from public.tasks where relationship_id=p_relationship_id order by id loop
    select m.participant_id,p.timezone into v_participant,v_timezone from public.relationship_period_members m
      join public.profiles p on p.id=m.user_id where m.relationship_id=p_relationship_id and m.role=case when v_task.is_dom_task then 'dom' else 'sub' end;
    if v_participant is null then raise exception using errcode='22023',message='TASK_OPENING_OWNER_REQUIRED'; end if;
    if v_timezone is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
    if v_task.frequency not in ('once','daily','weekly') or v_task.frequency is null or v_task.frequency_count is null or v_task.frequency_count<1 or (v_task.frequency='once' and v_task.frequency_count<>1) or v_task.points is null or v_task.points<0 then
      raise exception using errcode='22023',message='INVALID_TASK_DEFINITION';
    end if;
    v_date:=(v_at at time zone v_timezone)::date;
    v_monday:=v_date-(extract(isodow from v_date)::integer-1);
    select coalesce(jsonb_agg(to_jsonb(h) order by h.completed_at,h.id),'[]'::jsonb) into v_history
      from public.task_completion_history h where h.task_id=v_task.id and h.relationship_id=p_relationship_id;
    select jsonb_agg((select count(*) from public.task_completion_history h where h.task_id=v_task.id and h.relationship_id=p_relationship_id
      and h.action_event_id is null and h.completed_at<=v_at and (h.completed_at at time zone v_timezone)::date=v_monday+d) order by d)
      into v_marks from generate_series(0,6) d;
    insert into public.action_task_openings(relationship_id,task_id,beneficiary_participant_id,timezone,local_date,week_start_date,usage_data,source_snapshot,activated_at)
      values(p_relationship_id,v_task.id,v_participant,v_timezone,v_date,v_monday,v_marks,
        jsonb_build_object('task',to_jsonb(v_task),'history',v_history,'countBasis','recorded_legacy_history_at_cutover_timezone',
          'originalAwardValuesKnown',false,'historicalTimezoneKnown',false,'historicalBeneficiaryKnown',false),v_at);
  end loop;
  return v_result;
end $$;

create or replace function public._actions_task_definition_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_permission text; v_edit boolean;
begin
  if coalesce(auth.role(),'') not in ('authenticated','anon') then
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_OP='DELETE' then v_period:=OLD.relationship_id; else v_period:=coalesce(NEW.relationship_id,public.current_relationship_id()); end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then
    if TG_OP<>'DELETE' and (NEW.frequency='once' or NEW.mandatory or NEW.deadline_time is not null) then
      raise exception using errcode='42501',message='ATOMIC_TASK_COMMAND_REQUIRED'; end if;
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_OP='DELETE' then raise exception using errcode='42501',message='TASK_SOFT_DELETE_REQUIRED'; end if;
  if TG_OP='INSERT' then
    v_edit:=true;
    if coalesce(NEW.completed,false) or NEW.last_completed_date is not null or
       (NEW.usage_data is not null and NEW.usage_data not in ('[]'::jsonb,'[0,0,0,0,0,0,0]'::jsonb)) or NEW.deleted_at is not null then
      raise exception using errcode='42501',message='ATOMIC_TASK_COMMAND_REQUIRED';
    end if;
  else
    v_edit:=(to_jsonb(NEW)-'completed'-'last_completed_date'-'usage_data'-'week_identifier'-'updated_at') is distinct from
            (to_jsonb(OLD)-'completed'-'last_completed_date'-'usage_data'-'week_identifier'-'updated_at');
    if NEW.completed is distinct from OLD.completed or NEW.last_completed_date is distinct from OLD.last_completed_date or
       NEW.usage_data is distinct from OLD.usage_data or NEW.week_identifier is distinct from OLD.week_identifier then
      raise exception using errcode='42501',message='ATOMIC_TASK_COMMAND_REQUIRED';
    end if;
    if v_edit and OLD.deleted_at is not null then raise exception using errcode='42501',message='TASK_DELETED'; end if;
  end if;
  if v_edit then
    v_permission:=public.get_my_identity()->'permissions'->>'definition_manage';
    if v_permission is null or v_permission not in ('both',public.get_my_identity()->>'role') then raise exception using errcode='42501',message='ACTION_NOT_ALLOWED'; end if;
    if NEW.frequency not in ('once','daily','weekly') or NEW.frequency is null or NEW.frequency_count is null or NEW.frequency_count<1 or (NEW.frequency='once' and NEW.frequency_count<>1) or NEW.points is null or NEW.points<0 then
      raise exception using errcode='22023',message='INVALID_TASK_DEFINITION';
    end if;
  end if;
  return NEW;
end $$;

create or replace function public._actions_require_expected_context(p_expected jsonb,p_current jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare v_kind text:=p_current->>'kind'; v_keys text[]; v_expected_keys text[];
  v_calendars text[]; v_key text; v_e jsonb; v_c jsonb; v_fields text[];
begin
  if p_expected is null then raise exception using errcode='22023',message='ACTION_CONTEXT_REQUIRED'; end if;
  if jsonb_typeof(p_expected) is distinct from 'object' then
    raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  v_expected_keys:=case v_kind
    when 'task_complete' then case when p_expected->'version'='2'::jsonb then array['beneficiaryParticipantId','currency','deadline','dueAt','frequency','kind','localDate','mandatory','points','subjectId','target','timeZone','version','weekStartDate'] else array['beneficiaryParticipantId','currency','frequency','kind','localDate','points','subjectId','target','timeZone','version','weekStartDate'] end
    when 'rule_violation' then array['kind','sub','subjectId','version']
    when 'punishment_apply' then array['dom','domAward','kind','sub','subDeduction','subjectId','version'] end;
  select array_agg(k order by k) into v_keys from jsonb_object_keys(p_expected) k;
  if v_expected_keys is null or v_keys is distinct from v_expected_keys or
    (p_expected->'version' is distinct from '1'::jsonb and (v_kind<>'task_complete' or p_expected->'version' is distinct from '2'::jsonb)) or p_expected->'kind' is distinct from p_current->'kind' or
    p_expected->'subjectId' is distinct from p_current->'subjectId' then
    raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
  if v_kind='task_complete' then
    if p_expected->>'currency' not in('dom','sub') or jsonb_typeof(p_expected->'currency') is distinct from 'string' or
      p_expected->>'frequency' not in('once','daily','weekly') or (p_expected->>'frequency'='once' and (p_expected->'version'<>'2'::jsonb or p_expected->'target'<>'1'::jsonb)) or jsonb_typeof(p_expected->'frequency') is distinct from 'string' or
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
    if p_expected->'version'='2'::jsonb then
      if jsonb_typeof(p_expected->'mandatory') is distinct from 'boolean' or jsonb_typeof(p_expected->'deadline') is distinct from 'object' or
        (p_expected->'dueAt'<>'null'::jsonb and jsonb_typeof(p_expected->'dueAt') is distinct from 'string') then
        raise exception using errcode='22023',message='ACTION_CONTEXT_INVALID'; end if;
      v_fields:=array['points','frequency','target','mandatory','deadline'];
    else
      -- Historical queued v1 intentions remain valid only for unchanged neutral recurring definitions.
      if p_current->'mandatory'='true'::jsonb or p_current#>'{deadline,time}'<>'null'::jsonb or p_current->>'frequency'='once' then
        raise exception using errcode='22023',message='ACTION_DEFINITION_CHANGED',detail='task schedule'; end if;
      v_fields:=array['points','frequency','target'];
    end if; v_calendars:=array['task'];
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
  if v_kind='task_complete' and p_expected->'version'='2'::jsonb and p_expected->'dueAt' is distinct from p_current->'dueAt' then
    raise exception using errcode='22023',message='ACTION_DEFINITION_CHANGED',detail='dueAt'; end if;
end $$;

create or replace function public._actions_task_progress(p_period uuid,p_task uuid,p_at timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v_task public.tasks%rowtype; v_participant uuid; v_timezone text; v_date date; v_monday date;
  v_open public.action_task_openings%rowtype; v_marks integer[]:=array[0,0,0,0,0,0,0];
  v_i integer; v_count integer; v_latest date; v_role text; v_due timestamptz; v_deadline jsonb; v_last_late boolean; v_imported integer:=0; v_imported_date date;
begin
  select * into v_task from public.tasks where id=p_task and relationship_id=p_period;
  if not found then raise exception using errcode='22023',message='TASK_NOT_FOUND'; end if;
  v_role:=case when v_task.is_dom_task then 'dom' else 'sub' end;
  select m.participant_id,p.timezone into v_participant,v_timezone from public.relationship_period_members m join public.profiles p on p.id=m.user_id
    where m.relationship_id=p_period and m.role=v_role;
  if v_participant is null then raise exception using errcode='22023',message='TASK_OWNER_MISSING'; end if;
  if v_timezone is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
  if v_task.frequency not in ('once','daily','weekly') or v_task.frequency is null or v_task.frequency_count is null or v_task.frequency_count<1 or (v_task.frequency='once' and v_task.frequency_count<>1) or v_task.points is null or v_task.points<0 then
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
  if v_task.frequency='once' then
    -- Frozen imported history is count-only. Do not invent historical prices, dates or a new award after a type edit.
    select count(*)::integer,max((e.calendar->>'localDate')::date) into v_count,v_latest from public.action_events e
      where e.relationship_id=p_period and e.task_id=p_task and e.kind='task_completed'
      and not exists(select 1 from public.action_events r where r.reverses_event_id=e.id);
    select count(*)::integer,max((h.completed_at at time zone v_open.timezone)::date) into v_imported,v_imported_date
      from jsonb_to_recordset(coalesce(v_open.source_snapshot->'history','[]'::jsonb)) h(completed_at timestamptz,action_event_id uuid)
      where h.action_event_id is null and h.completed_at<=v_open.activated_at;
    v_count:=v_count+v_imported; v_latest:=greatest(v_latest,v_imported_date);
  else
    if v_task.frequency='daily' then v_count:=v_marks[extract(isodow from v_date)::integer];
    else select sum(x)::integer into v_count from unnest(v_marks) x; end if;
    select max(v_monday+d) into v_latest from generate_series(0,6) d where v_marks[d+1]>0 and
      (v_task.frequency='weekly' or v_monday+d=v_date);
  end if;
  v_deadline:=jsonb_build_object('date',v_task.deadline_date,'time',to_char(date '2000-01-01'+v_task.deadline_time,'HH24:MI'),'weekday',v_task.deadline_weekday);
  if v_task.deadline_time is not null then
    -- Same DST policy as saved wellbeing times: first occurrence in a fold, first valid minute after a gap.
    -- No notification, penalty, ledger write or scheduler is involved in resolving this deadline.
    v_due:=public._notification_due_on(case v_task.frequency when 'once' then v_task.deadline_date
      when 'weekly' then v_monday+v_task.deadline_weekday-1 else v_date end,v_task.deadline_time,v_timezone);
    if v_due is null then raise exception using errcode='22023',message='INVALID_TASK_DEFINITION'; end if;
  end if;
  select (e.definition_values->>'late')::boolean into v_last_late from public.action_events e
    where e.relationship_id=p_period and e.task_id=p_task and e.kind='task_completed'
      and (v_task.frequency='once' or (v_task.frequency='daily' and (e.calendar->>'localDate')::date=v_date)
        or (v_task.frequency='weekly' and (e.calendar->>'localDate')::date between v_monday and v_monday+6))
      and not exists(select 1 from public.action_events r where r.reverses_event_id=e.id)
    order by e.recorded_at desc,e.id desc limit 1;
  return jsonb_build_object('taskId',p_task,'beneficiaryParticipantId',v_participant,'currency',v_role,'timeZone',v_timezone,
    'localDate',v_date,'weekStartDate',v_monday,'weekIdentifier',to_char(v_date,'IYYY-"W"IW'),
    'frequency',v_task.frequency,'target',v_task.frequency_count,'currentCount',v_count,'usageData',to_jsonb(v_marks),
    'completed',v_count>=v_task.frequency_count,'lastCompletedDate',v_latest,'deleted',v_task.deleted_at is not null,
    'mandatory',v_task.mandatory,'deadline',v_deadline,'dueAt',v_due,'overdue',v_due is not null and p_at>v_due and v_count<v_task.frequency_count,'lastCompletionLate',v_last_late,
    'expectedContext',jsonb_build_object('version',2,'kind','task_complete','subjectId',p_task,
      'beneficiaryParticipantId',v_participant,'currency',v_role,'points',v_task.points,'frequency',v_task.frequency,
      'target',v_task.frequency_count,'mandatory',v_task.mandatory,'deadline',v_deadline,'dueAt',v_due,
      'timeZone',v_timezone,'localDate',v_date,'weekStartDate',v_monday));
end $$;

create or replace function public._execute_task_with_context(
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
    v_values:=jsonb_build_object('type','task','points',v_task.points,'frequency',v_task.frequency,'target',v_task.frequency_count,
      'mandatory',v_task.mandatory,'deadline',v_progress->'deadline','dueAt',v_progress->'dueAt','late',v_progress->'overdue');
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
-- CREATE OR REPLACE retains each existing function's private ACL. No service permissions or delivery settings change.
notify pgrst,'reload schema';
commit;
