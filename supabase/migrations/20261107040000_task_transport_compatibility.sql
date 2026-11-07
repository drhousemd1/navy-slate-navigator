-- Preserve neutral recurring-task transport for already-open pre-task-type clients.
-- No ledger/receipt rewrites. Modern clients explicitly advertise response support.
begin;
create function public._actions_compatible_task_progress(p_progress jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select case when p_progress->>'frequency' in ('daily','weekly') and
    p_progress->'mandatory'='false'::jsonb and p_progress->'deadline'='{"date":null,"time":null,"weekday":null}'::jsonb and p_progress->'dueAt'='null'::jsonb and
    p_progress#>'{expectedContext,version}'='2'::jsonb and p_progress#>'{expectedContext,mandatory}'='false'::jsonb and
    p_progress#>'{expectedContext,deadline}'='{"date":null,"time":null,"weekday":null}'::jsonb and p_progress#>'{expectedContext,dueAt}'='null'::jsonb and
    p_progress#>'{expectedContext,frequency}'=p_progress->'frequency'
  then jsonb_set(p_progress,'{expectedContext}',((p_progress->'expectedContext') - 'mandatory' - 'deadline' - 'dueAt')||'{"version":1}'::jsonb)
  else p_progress end;
$$;
revoke all on function public._actions_compatible_task_progress(jsonb) from public,anon,authenticated,service_role;

create or replace function public.get_task_progress(p_expected_relationship_id uuid,p_task_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_period uuid:=public.current_relationship_id(); v_result jsonb; v_at timestamptz:=statement_timestamp();
  v_modern boolean:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-task-context-version'='2';
begin
  if v_period is null or p_expected_relationship_id is distinct from v_period then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then raise exception using errcode='42501',message='ACCOUNTING_NOT_ENABLED'; end if;
  if p_task_id is not null then
    v_result:=public._actions_task_progress(v_period,p_task_id,v_at);
    return case when v_modern then v_result else public._actions_compatible_task_progress(v_result) end;
  end if;
  select coalesce(jsonb_agg(case when v_modern then p else public._actions_compatible_task_progress(p) end order by id),'[]'::jsonb) into v_result
    from (select id,public._actions_task_progress(v_period,id,v_at) p from public.tasks where relationship_id=v_period and deleted_at is null) tasks;
  return v_result;
end $$;

create or replace function public.get_my_action_receipt(p_command_id uuid,p_expected_relationship_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select r.receipt into v_result from public.action_command_receipts r
    join public.relationship_period_members m on m.participant_id=r.actor_participant_id and m.relationship_id=r.relationship_id
    where r.command_id=p_command_id and r.relationship_id=p_expected_relationship_id
      and r.actor_user_id=auth.uid() and m.user_id=auth.uid();
  -- Project only the stored neutral snapshot, never the task's current values.
  -- New schedules/unknown shapes stay v2; no schedule fact is disguised or lost.
  if coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-task-context-version' is distinct from '2' and
    jsonb_typeof(v_result->'taskProgress')='object' then
    return jsonb_set(v_result,'{taskProgress}',public._actions_compatible_task_progress(v_result->'taskProgress'));
  end if;
  return v_result;
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
    -- Response capability is not authentication. An old queued Undo has no
    -- expectedContext; reject unsupported supplemental progress BEFORE writes.
    -- Receipt matching/replay above still wins, even after later definition edits.
    if coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-task-context-version' is distinct from '2' and
       (v_task.frequency='once' or v_task.mandatory or v_task.deadline_time is not null) then
      raise exception using errcode='22023',message='TASK_CLIENT_UPDATE_REQUIRED',detail='Update this app, then review Undo. No new action was recorded.';
    end if;
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
-- Existing function ACLs/owners remain; no service settings or data changed.
notify pgrst,'reload schema';
commit;
