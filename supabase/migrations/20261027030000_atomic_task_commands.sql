-- STAGED task Complete/Undo. No existing period is activated by this migration.
-- Source contract: TaskEditorForm.tsx Points / Times per period; guide TASKS;
-- CompletionButton disables at maximum. Weekly uses one weekly total (the old
-- per-day weekly cap was defective). Latest user amendments restore shared Undo.
begin;

alter table public.tasks add column deleted_at timestamptz;
alter table public.tasks add constraint action_task_period unique(id,relationship_id);
alter table public.action_events add column task_id uuid;
alter table public.action_events add constraint action_event_task_period foreign key(task_id,relationship_id) references public.tasks(id,relationship_id);
alter table public.action_events drop constraint action_events_kind_check;
alter table public.action_events add constraint action_events_kind_check check(kind in
  ('opening_balance','opening_inventory','reward_purchased','reward_gifted','reward_redeemed','reward_deleted','action_undone','task_completed'));
create index action_events_task on public.action_events(relationship_id,task_id,recorded_at) where task_id is not null;
alter table public.action_point_entries drop constraint action_point_entries_reason_check;
alter table public.action_point_entries add constraint action_point_entries_reason_check check(reason in
  ('opening_balance','purchase','paid_refund','migration_credit','task_award','task_undo'));
alter table public.task_completion_history add column action_event_id uuid unique references public.action_events(id);

create table public.action_task_openings (
  relationship_id uuid not null,
  task_id uuid not null,
  beneficiary_participant_id uuid not null references public.relationship_period_members(participant_id),
  timezone text not null,
  local_date date not null,
  week_start_date date not null,
  usage_data jsonb not null check(jsonb_typeof(usage_data)='array' and jsonb_array_length(usage_data)=7),
  -- Private frozen rows: legacy timestamps and current definition, NOT a claim
  -- about original awards, original beneficiary or historical timezone.
  source_snapshot jsonb not null,
  activated_at timestamptz not null,
  primary key(relationship_id,task_id),
  foreign key(task_id,relationship_id) references public.tasks(id,relationship_id)
);
alter table public.action_task_openings enable row level security;
revoke all on public.action_task_openings from public,anon,authenticated;
grant select,insert,update,delete on public.action_task_openings to service_role;
create trigger immutable_task_opening before update or delete on public.action_task_openings for each row execute function public._actions_immutable();

-- Preserve the accepted reward activation function verbatim. The wrapper adds
-- count-only task openings in the SAME transaction; failure rolls everything back.
alter function public.activate_action_accounting(uuid) rename to _activate_reward_accounting;
revoke all on function public._activate_reward_accounting(uuid) from public,anon,authenticated,service_role;
create function public.activate_action_accounting(p_relationship_id uuid) returns jsonb
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
    if v_task.frequency not in ('daily','weekly') or v_task.frequency is null or v_task.frequency_count is null or v_task.frequency_count<1 or v_task.points is null or v_task.points<0 then
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
revoke all on function public.activate_action_accounting(uuid) from public,anon,authenticated;
grant execute on function public.activate_action_accounting(uuid) to service_role;

-- Pure read of immutable event marks and the frozen migration count basis.
-- Definition edits never erase marks or reprice prior awards. Current frequency
-- chooses a daily or weekly count; changing type redirects FUTURE points only.
create function public._actions_task_progress(p_period uuid,p_task uuid,p_at timestamptz) returns jsonb
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
    'completed',v_count>=v_task.frequency_count,'lastCompletedDate',v_latest,'deleted',v_task.deleted_at is not null);
end $$;

create function public.get_task_progress(p_expected_relationship_id uuid,p_task_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_period uuid:=public.current_relationship_id(); v_result jsonb; v_at timestamptz:=statement_timestamp();
begin
  if v_period is null or p_expected_relationship_id is distinct from v_period then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then raise exception using errcode='42501',message='ACCOUNTING_NOT_ENABLED'; end if;
  if p_task_id is not null then return public._actions_task_progress(v_period,p_task_id,v_at); end if;
  select coalesce(jsonb_agg(public._actions_task_progress(v_period,id,v_at) order by id),'[]'::jsonb) into v_result
    from public.tasks where relationship_id=v_period and deleted_at is null;
  return v_result;
end $$;

-- Direct definition edits remain possible with configured pair permissions.
-- Runtime counters come from get_task_progress; legacy task fields are frozen
-- compatibility data after activation, never a browser-supplied source of points.
create function public._actions_task_definition_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_permission text; v_edit boolean;
begin
  if coalesce(auth.role(),'') not in ('authenticated','anon') then
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_OP='DELETE' then v_period:=OLD.relationship_id; else v_period:=coalesce(NEW.relationship_id,public.current_relationship_id()); end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then
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
    if NEW.frequency not in ('daily','weekly') or NEW.frequency is null or NEW.frequency_count is null or NEW.frequency_count<1 or NEW.points is null or NEW.points<0 then
      raise exception using errcode='22023',message='INVALID_TASK_DEFINITION';
    end if;
  end if;
  return NEW;
end $$;
create trigger atomic_task_definition_guard before insert or update or delete on public.tasks for each row execute function public._actions_task_definition_guard();

-- Only the task-history branch changes; reward and balance checks stay identical.
create or replace function public._actions_legacy_write_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_enabled boolean; v_permission text; v_role text; v_balance integer;
  v_event public.action_events%rowtype; v_business_edit boolean; v_expected_supply integer;
begin
  if coalesce(auth.role(),'') not in ('authenticated','anon') then
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_TABLE_NAME='profiles' then
    select relationship_id into v_period from public.identity_contexts where user_id=OLD.id;
  elsif TG_OP='DELETE' then v_period:=OLD.relationship_id;
  else v_period:=coalesce(NEW.relationship_id,public.current_relationship_id()); end if;
  select accounting_enabled into v_enabled from public.action_accounting_periods where relationship_id=v_period;
  if not coalesce(v_enabled,false) then
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_TABLE_NAME='profiles' then
    if NEW.points is distinct from OLD.points or NEW.dom_points is distinct from OLD.dom_points then
      select w.currency,w.balance into v_role,v_balance from public.action_wallets w
        join public.relationship_period_members m on m.participant_id=w.participant_id
        where w.relationship_id=v_period and m.user_id=OLD.id;
      if v_role is null or
         (v_role='sub' and (NEW.points is distinct from v_balance or NEW.dom_points is distinct from OLD.dom_points)) or
         (v_role='dom' and (NEW.dom_points is distinct from v_balance or NEW.points is distinct from OLD.points)) then
        raise exception using errcode='42501',message='ATOMIC_BALANCE_COMMAND_REQUIRED';
      end if;
    end if;
  elsif TG_TABLE_NAME='task_completion_history' then
    if TG_OP='INSERT' then
      select * into v_event from public.action_events where id=NEW.action_event_id and relationship_id=v_period and kind='task_completed';
      if v_event.id is null or exists(select 1 from public.action_events where reverses_event_id=v_event.id) or
         NEW.task_id is distinct from v_event.task_id or NEW.completed_at is distinct from v_event.recorded_at or
         not exists(select 1 from public.relationship_period_members where participant_id=v_event.beneficiary_participant_id and user_id=NEW.user_id) then
        raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
      end if;
    elsif TG_OP='DELETE' then
      if not exists(select 1 from public.action_events where reverses_event_id=OLD.action_event_id and kind='action_undone' and relationship_id=v_period) then
        raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
      end if;
      return OLD;
    else raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED'; end if;
  elsif TG_TABLE_NAME in ('rule_violations','punishment_history') then
    raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
  elsif TG_TABLE_NAME='reward_usage' then
    if TG_OP='INSERT' then
      select * into v_event from public.action_events where id=NEW.action_event_id and relationship_id=v_period and kind='reward_redeemed';
      if v_event.id is null or NEW.reward_id is distinct from v_event.reward_id or NEW.used is distinct from true or
         not exists(select 1 from public.relationship_period_members where participant_id=v_event.beneficiary_participant_id and user_id=NEW.user_id) or
         not exists(select 1 from public.reward_inventory_lots where active_redemption_event_id=v_event.id and status='redeemed') or
         NEW.day_of_week is distinct from (extract(isodow from (v_event.calendar->>'localDate')::date)::integer-1) or
         NEW.week_number is distinct from to_char((v_event.calendar->>'localDate')::date,'IYYY-"W"IW') then
        raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED';
      end if;
    elsif TG_OP='DELETE' then
      if not exists(select 1 from public.action_events where reverses_event_id=OLD.action_event_id and kind='action_undone' and relationship_id=v_period) then
        raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED';
      end if;
      return OLD;
    else raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED'; end if;
  elsif TG_TABLE_NAME='rewards' then
    if TG_OP='DELETE' then raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED'; end if;
    select count(*)::integer into v_expected_supply from public.reward_inventory_lots where reward_id=NEW.id and status='available';
    if NEW.supply is distinct from v_expected_supply then raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED'; end if;
    if TG_OP='INSERT' then
      v_business_edit:=true;
      if NEW.deleted_at is not null then raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED'; end if;
    else
      v_business_edit:=(to_jsonb(NEW)-'supply'-'deleted_at'-'updated_at') is distinct from (to_jsonb(OLD)-'supply'-'deleted_at'-'updated_at');
      if NEW.deleted_at is distinct from OLD.deleted_at and
         (OLD.deleted_at is not null or NEW.deleted_at is null or not exists(select 1 from public.action_events
           where reward_id=NEW.id and relationship_id=v_period and kind='reward_deleted' and recorded_at=NEW.deleted_at)) then
        raise exception using errcode='42501',message='ATOMIC_REWARD_COMMAND_REQUIRED';
      end if;
      if v_business_edit and OLD.deleted_at is not null then raise exception using errcode='42501',message='REWARD_DELETED'; end if;
    end if;
    if v_business_edit then
      v_permission:=public.get_my_identity()->'permissions'->>'definition_manage';
      if v_permission is null or v_permission not in ('both',public.get_my_identity()->>'role') then
        raise exception using errcode='42501',message='ACTION_NOT_ALLOWED';
      end if;
      if NEW.cost is null or NEW.cost<0 then raise exception using errcode='22023',message='INVALID_REWARD_COST'; end if;
    end if;
  end if;
  return NEW;
end $$;

create function public.execute_task_command(
  p_command_id uuid,p_expected_relationship_id uuid,p_action text,p_task_id uuid default null,p_event_id uuid default null
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
  v_payload:=jsonb_build_object('relationshipId',p_expected_relationship_id,'kind',p_action,'taskId',p_task_id,'eventId',p_event_id);
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

-- The original event selects its own domain. Clients supply no family, actor,
-- point amount, beneficiary, calendar timestamp or caller-controlled authority.
create function public.undo_action(p_command_id uuid,p_expected_relationship_id uuid,p_event_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_kind text;
begin
  perform public._identity_lock();
  v_period:=public.current_relationship_id();
  if v_period is null or p_expected_relationship_id is distinct from v_period then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  select kind into v_kind from public.action_events where id=p_event_id and relationship_id=v_period;
  if v_kind='task_completed' then return public.execute_task_command(p_command_id,p_expected_relationship_id,'undo',null,p_event_id);
  elsif v_kind in ('reward_purchased','reward_redeemed') then return public.execute_reward_command(p_command_id,p_expected_relationship_id,'undo',null,p_event_id,null);
  else raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE'; end if;
end $$;

revoke all on function public._actions_task_progress(uuid,uuid,timestamptz),public._actions_task_definition_guard(),
  public.get_task_progress(uuid,uuid),public.execute_task_command(uuid,uuid,text,uuid,uuid),public.undo_action(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_task_progress(uuid,uuid),public.execute_task_command(uuid,uuid,text,uuid,uuid),public.undo_action(uuid,uuid,uuid) to authenticated;
comment on table public.action_task_openings is 'Count-only cutover basis. Raw source history/definition preserved privately; original awards, roles and timezone were not recorded and cannot be invented for Undo.';
comment on column public.tasks.deleted_at is 'Remove a task from future selection without destroying prior action evidence. Task progress comes from immutable events and migration openings, not these legacy counters.';
notify pgrst,'reload schema';
commit;
