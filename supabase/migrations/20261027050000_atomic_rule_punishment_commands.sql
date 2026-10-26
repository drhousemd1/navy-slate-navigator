-- STAGED: no existing relationship is activated. Rule Broken logs an infraction;
-- it has no point penalty. Punish independently debits Sub (down to zero without
-- erasing an existing correction debt) and awards the configured Dom amount.
-- There is no frequency cap, supply gate, or automatic violation/punishment link.
begin;

alter table public.rules add column deleted_at timestamptz;
alter table public.punishments add column deleted_at timestamptz;
alter table public.rules add constraint action_rule_period unique(id,relationship_id);
alter table public.punishments add constraint action_punishment_period unique(id,relationship_id);
alter table public.action_events add column rule_id uuid;
alter table public.action_events add column punishment_id uuid;
alter table public.action_events add constraint action_event_rule_period foreign key(rule_id,relationship_id) references public.rules(id,relationship_id);
alter table public.action_events add constraint action_event_punishment_period foreign key(punishment_id,relationship_id) references public.punishments(id,relationship_id);
alter table public.action_events drop constraint action_events_kind_check;
alter table public.action_events add constraint action_events_kind_check check(kind in
  ('opening_balance','opening_inventory','reward_purchased','reward_gifted','reward_redeemed','reward_deleted','action_undone',
   'task_completed','rule_violated','punishment_applied'));
create index action_events_rule on public.action_events(relationship_id,rule_id,recorded_at) where rule_id is not null;
create index action_events_punishment on public.action_events(relationship_id,punishment_id,recorded_at) where punishment_id is not null;
alter table public.action_point_entries drop constraint action_point_entries_reason_check;
alter table public.action_point_entries add constraint action_point_entries_reason_check check(reason in
  ('opening_balance','purchase','paid_refund','migration_credit','task_award','task_undo','punishment_deduction','punishment_award','punishment_undo'));
-- A punishment can affect two people in different timezones. Old entries retain
-- the event calendar fallback; new punishment entries snapshot each person's clock.
alter table public.action_point_entries add column calendar jsonb;
alter table public.rule_violations add column action_event_id uuid unique references public.action_events(id);
alter table public.punishment_history add column action_event_id uuid unique references public.action_events(id);

-- Extend the service-owned activation transaction, preserving prior bodies.
-- Private raw history remains evidence, never an invented historical award receipt.
alter function public.activate_action_accounting(uuid) rename to _activate_task_reward_accounting;
revoke all on function public._activate_task_reward_accounting(uuid) from public,anon,authenticated,service_role;
create function public.activate_action_accounting(p_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_at timestamptz; v_sub uuid; v_tz text; v_date date; v_monday date;
  v_source jsonb; v_items jsonb:='[]'::jsonb; v_item record; v_history jsonb; v_marks jsonb;
begin
  v_result:=public._activate_task_reward_accounting(p_relationship_id);
  select activated_at into strict v_at from public.action_accounting_periods where relationship_id=p_relationship_id;
  select m.participant_id,p.timezone into v_sub,v_tz from public.relationship_period_members m join public.profiles p on p.id=m.user_id
    where m.relationship_id=p_relationship_id and m.role='sub';
  perform 1 from public.rules where relationship_id=p_relationship_id order by id for update;
  perform 1 from public.punishments where relationship_id=p_relationship_id order by id for update;
  -- Empty solo-Dom catalogs can be retained without inventing a Sub clock. New
  -- recordings require the real Sub participant; no phantom wallet is created.
  if v_sub is not null and v_tz is null and
    (exists(select 1 from public.rules where relationship_id=p_relationship_id) or
     exists(select 1 from public.punishments where relationship_id=p_relationship_id)) then
    raise exception using errcode='22023',message='TIMEZONE_REQUIRED';
  end if;
  if v_tz is not null then
    v_date:=(v_at at time zone v_tz)::date; v_monday:=v_date-(extract(isodow from v_date)::integer-1);
  end if;
  for v_item in
    select 'rule'::text as kind,r.id,to_jsonb(r) as definition from public.rules r where r.relationship_id=p_relationship_id
    union all select 'punishment',p.id,to_jsonb(p) from public.punishments p where p.relationship_id=p_relationship_id
    order by kind,id
  loop
    if v_item.kind='rule' then
      select coalesce(jsonb_agg(to_jsonb(h) order by h.violation_date,h.id),'[]'::jsonb) into v_history
        from public.rule_violations h where h.relationship_id=p_relationship_id and h.rule_id=v_item.id;
      select jsonb_agg((select count(*) from public.rule_violations h where h.relationship_id=p_relationship_id and h.rule_id=v_item.id
        and h.action_event_id is null and h.violation_date<=v_at and (h.violation_date at time zone v_tz)::date=v_monday+d) order by d)
        into v_marks from generate_series(0,6) d;
    else
      if (v_item.definition->>'points')::integer<0 or (v_item.definition->>'dom_points')::integer<0 then
        raise exception using errcode='22023',message='INVALID_PUNISHMENT_DEFINITION';
      end if;
      select coalesce(jsonb_agg(to_jsonb(h) order by h.applied_date,h.id),'[]'::jsonb) into v_history
        from public.punishment_history h where h.relationship_id=p_relationship_id and h.punishment_id=v_item.id;
      select jsonb_agg((select count(*) from public.punishment_history h where h.relationship_id=p_relationship_id and h.punishment_id=v_item.id
        and h.action_event_id is null and h.applied_date<=v_at and (h.applied_date at time zone v_tz)::date=v_monday+d) order by d)
        into v_marks from generate_series(0,6) d;
    end if;
    v_items:=v_items||jsonb_build_array(jsonb_build_object('subjectType',v_item.kind,'subjectId',v_item.id,
      'definition',v_item.definition,'history',v_history,'usageData',v_marks));
  end loop;
  v_source:=jsonb_build_object('beneficiaryParticipantId',v_sub,'timeZone',v_tz,'localDate',v_date,'weekStartDate',v_monday,
    'countBasis','recorded_legacy_history_at_cutover_timezone','historicalTimezoneKnown',false,'historicalBeneficiaryKnown',false,
    'originalAwardValuesKnown',false,'items',v_items);
  update public.action_accounting_periods set source_snapshot=source_snapshot||jsonb_build_object('recordingOpening',v_source)
    where relationship_id=p_relationship_id;
  return v_result;
end $$;
revoke all on function public.activate_action_accounting(uuid) from public,anon,authenticated;
grant execute on function public.activate_action_accounting(uuid) to service_role;

create function public._actions_recording_calendar(p_period uuid,p_participant uuid,p_at timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v_tz text; v_date date;
begin
  select p.timezone into v_tz from public.relationship_period_members m join public.profiles p on p.id=m.user_id
    where m.relationship_id=p_period and m.participant_id=p_participant;
  if v_tz is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
  v_date:=(p_at at time zone v_tz)::date;
  return jsonb_build_object('participantId',p_participant,'timeZone',v_tz,'localDate',v_date,
    'weekStartDate',v_date-(extract(isodow from v_date)::integer-1));
end $$;

create function public._actions_recording_progress(p_period uuid,p_type text,p_subject uuid,p_at timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare v_sub uuid; v_deleted boolean; v_calendar jsonb; v_open jsonb; v_item jsonb;
  v_monday date; v_marks integer[]:=array[0,0,0,0,0,0,0]; v_i integer; v_count integer;
begin
  if p_type='rule' then select deleted_at is not null into v_deleted from public.rules where id=p_subject and relationship_id=p_period;
  elsif p_type='punishment' then select deleted_at is not null into v_deleted from public.punishments where id=p_subject and relationship_id=p_period;
  else raise exception using errcode='22023',message='INVALID_RECORDING_SUBJECT'; end if;
  if not found then raise exception using errcode='22023',message='RECORDING_SUBJECT_NOT_FOUND'; end if;
  select participant_id into v_sub from public.relationship_period_members where relationship_id=p_period and role='sub';
  if v_sub is null then raise exception using errcode='22023',message='SUB_PARTICIPANT_REQUIRED'; end if;
  v_calendar:=public._actions_recording_calendar(p_period,v_sub,p_at); v_monday:=(v_calendar->>'weekStartDate')::date;
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
    'usageData',to_jsonb(v_marks),'currentCount',(select sum(x) from unnest(v_marks) x),'deleted',v_deleted);
end $$;

create function public.get_recording_progress(p_expected_relationship_id uuid,p_subject_type text,p_subject_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_period uuid:=public.current_relationship_id(); v_result jsonb; v_at timestamptz:=statement_timestamp();
begin
  if v_period is null or p_expected_relationship_id is distinct from v_period then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then raise exception using errcode='42501',message='ACCOUNTING_NOT_ENABLED'; end if;
  if p_subject_type is null or p_subject_type not in ('rule','punishment') then raise exception using errcode='22023',message='INVALID_RECORDING_SUBJECT'; end if;
  if p_subject_id is not null then return public._actions_recording_progress(v_period,p_subject_type,p_subject_id,v_at); end if;
  select coalesce(jsonb_agg(public._actions_recording_progress(v_period,p_subject_type,id,v_at) order by id),'[]'::jsonb) into v_result from (
    select id from public.rules where relationship_id=v_period and deleted_at is null and p_subject_type='rule'
    union all select id from public.punishments where relationship_id=v_period and deleted_at is null and p_subject_type='punishment') s;
  return v_result;
end $$;

-- Definition editing retains shared configured permission. Runtime rule counters
-- are frozen compatibility data after activation; no page-load reset may erase marks.
create function public._actions_recording_definition_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_edit boolean; v_identity jsonb;
begin
  if coalesce(auth.role(),'') not in ('authenticated','anon') then
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_OP='DELETE' then v_period:=OLD.relationship_id; else v_period:=coalesce(NEW.relationship_id,public.current_relationship_id()); end if;
  if not exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then
    if TG_OP='DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_OP='DELETE' then raise exception using errcode='42501',message='DEFINITION_SOFT_DELETE_REQUIRED'; end if;
  if TG_OP='INSERT' then
    v_edit:=true;
    if NEW.deleted_at is not null then raise exception using errcode='42501',message='INVALID_DEFINITION_REMOVAL'; end if;
    if TG_TABLE_NAME='rules' then
      if NEW.usage_data is not null and NEW.usage_data not in ('[]'::jsonb,'[0,0,0,0,0,0,0]'::jsonb) then
        raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
      end if;
    end if;
  else
    v_edit:=(to_jsonb(NEW)-'updated_at') is distinct from (to_jsonb(OLD)-'updated_at');
    if TG_TABLE_NAME='rules' then
      if NEW.usage_data is distinct from OLD.usage_data then
        raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
      end if;
    end if;
    if v_edit and OLD.deleted_at is not null then raise exception using errcode='42501',message='DEFINITION_DELETED'; end if;
  end if;
  if v_edit then
    v_identity:=public.get_my_identity();
    perform public._actions_require_permission(v_period,v_identity->>'role','definition_manage');
    if TG_TABLE_NAME='punishments' then
      if NEW.points is null or NEW.points<0 or NEW.dom_points is null or NEW.dom_points<0 then
        raise exception using errcode='22023',message='INVALID_PUNISHMENT_DEFINITION';
      end if;
    end if;
  end if;
  return NEW;
end $$;
create trigger atomic_rule_definition_guard before insert or update or delete on public.rules for each row execute function public._actions_recording_definition_guard();
create trigger atomic_punishment_definition_guard before insert or update or delete on public.punishments for each row execute function public._actions_recording_definition_guard();

-- The six-argument helper and its consumers remain unchanged. This overload
-- inserts the immutable calendar with the delta, rather than editing evidence.
create function public._actions_wallet_delta(p_event uuid,p_period uuid,p_participant uuid,p_currency text,p_amount integer,p_reason text,p_calendar jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare v_balance integer; v_user uuid;
begin
  update public.action_wallets set balance=balance+p_amount
    where participant_id=p_participant and relationship_id=p_period and currency=p_currency returning balance into v_balance;
  if not found then raise exception using errcode='22023',message='WALLET_NOT_FOUND'; end if;
  insert into public.action_point_entries(event_id,relationship_id,participant_id,currency,amount,reason,calendar)
    values(p_event,p_period,p_participant,p_currency,p_amount,p_reason,p_calendar);
  select m.user_id into v_user from public.relationship_period_members m join public.identity_contexts c on c.user_id=m.user_id and c.relationship_id=m.relationship_id
    where m.participant_id=p_participant and m.relationship_id=p_period and m.role=p_currency;
  if v_user is null then raise exception using errcode='42501',message='CURRENT_WALLET_OWNER_REQUIRED'; end if;
  if p_currency='dom' then update public.profiles set dom_points=v_balance,updated_at=clock_timestamp() where id=v_user;
  else update public.profiles set points=v_balance,updated_at=clock_timestamp() where id=v_user; end if;
end $$;

-- Only rule/punishment history changes; task/reward/profile branches are preserved.
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
    if TG_OP='INSERT' then
      select * into v_event from public.action_events where id=NEW.action_event_id and relationship_id=v_period;
      if v_event.id is null or exists(select 1 from public.action_events where reverses_event_id=v_event.id) or
         not exists(select 1 from public.relationship_period_members where participant_id=v_event.beneficiary_participant_id and user_id=NEW.user_id and role='sub') or
         NEW.day_of_week is distinct from (extract(isodow from (v_event.calendar->>'localDate')::date)::integer-1) then
        raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
      end if;
      if TG_TABLE_NAME='rule_violations' then
        if v_event.kind<>'rule_violated' or NEW.rule_id is distinct from v_event.rule_id or NEW.violation_date is distinct from v_event.recorded_at or
           NEW.week_number is distinct from to_char((v_event.calendar->>'localDate')::date,'IYYY-"W"IW') then
          raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
        end if;
      else
        if v_event.kind<>'punishment_applied' or NEW.punishment_id is distinct from v_event.punishment_id or NEW.applied_date is distinct from v_event.recorded_at or
           NEW.points_deducted is distinct from (select -amount from public.action_point_entries where event_id=v_event.id and currency='sub' and reason='punishment_deduction') then
          raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
        end if;
      end if;
    elsif TG_OP='DELETE' then
      if not exists(select 1 from public.action_events where reverses_event_id=OLD.action_event_id and kind='action_undone' and relationship_id=v_period) then
        raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED';
      end if;
      return OLD;
    else raise exception using errcode='42501',message='ATOMIC_ACTION_COMMAND_REQUIRED'; end if;
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

create function public.execute_recording_command(
  p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_rule_id uuid default null,p_punishment_id uuid default null,p_event_id uuid default null
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
  v_payload:=jsonb_build_object('relationshipId',p_expected_relationship_id,'kind',p_action,'ruleId',p_rule_id,'punishmentId',p_punishment_id,'eventId',p_event_id);
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
  v_at:=clock_timestamp();
  if p_action<>'undo' then
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
    if p_action='undo' and v_error in ('SUB_PARTICIPANT_REQUIRED','TIMEZONE_REQUIRED','RECORDING_NOT_INITIALIZED') then v_progress:=null;
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

create or replace function public.undo_action(p_command_id uuid,p_expected_relationship_id uuid,p_event_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_kind text;
begin
  perform public._identity_lock();
  v_period:=public.current_relationship_id();
  if v_period is null or p_expected_relationship_id is distinct from v_period then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  select kind into v_kind from public.action_events where id=p_event_id and relationship_id=v_period;
  if v_kind='task_completed' then return public.execute_task_command(p_command_id,p_expected_relationship_id,'undo',null,p_event_id);
  elsif v_kind in ('reward_purchased','reward_redeemed') then return public.execute_reward_command(p_command_id,p_expected_relationship_id,'undo',null,p_event_id,null);
  elsif v_kind in ('rule_violated','punishment_applied') then return public.execute_recording_command(p_command_id,p_expected_relationship_id,'undo',null,null,p_event_id);
  else raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE'; end if;
end $$;

revoke all on function public._actions_recording_calendar(uuid,uuid,timestamptz),public._actions_recording_progress(uuid,text,uuid,timestamptz),
  public._actions_recording_definition_guard(),public._actions_wallet_delta(uuid,uuid,uuid,text,integer,text,jsonb),
  public.get_recording_progress(uuid,text,uuid),public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_recording_progress(uuid,text,uuid),public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid) to authenticated;
comment on column public.action_point_entries.calendar is 'Immutable affected-person calendar for new punishment deltas and their reversals; older entries use their event calendar. Not inferred historical timezone.';
comment on column public.rule_violations.action_event_id is 'Active compatibility projection only. Original rule event and Undo remain in action_events.';
comment on column public.punishment_history.action_event_id is 'Active compatibility projection only; points_deducted is actual new debit, not configured value. Legacy values remain unchanged and unknown as accounting evidence.';
notify pgrst,'reload schema';
commit;
