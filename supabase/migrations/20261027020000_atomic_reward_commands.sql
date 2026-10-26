-- STAGED: creates no opening ledger and enables no existing relationship.
-- Operator activation is a separate, reviewed cutover after all balance writers
-- and reward consumers are switched. lifecycle_ready remains independent/FALSE.
-- Never activate while legacy multi-request mutations are in flight.
begin;

alter table public.rewards add column deleted_at timestamptz;
alter table public.relationship_period_members add constraint action_member_identity unique(participant_id,relationship_id,role);
alter table public.rewards add constraint action_reward_period unique(id,relationship_id);

create table public.action_accounting_periods (
  relationship_id uuid primary key references public.relationship_periods(id),
  accounting_enabled boolean not null default false,
  activation_id uuid unique,
  activated_at timestamptz,
  -- Private, complete source values at cutover; never returned to participants.
  source_snapshot jsonb,
  check (not accounting_enabled or (activation_id is not null and activated_at is not null and source_snapshot is not null))
);
create table public.action_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationship_periods(id),
  command_id uuid,
  kind text not null check(kind in ('opening_balance','opening_inventory','reward_purchased','reward_gifted','reward_redeemed','reward_deleted','action_undone')),
  actor_participant_id uuid references public.relationship_period_members(participant_id),
  beneficiary_participant_id uuid references public.relationship_period_members(participant_id),
  reward_id uuid,
  subject jsonb not null,
  definition_values jsonb,
  calendar jsonb,
  intent jsonb not null default '{}'::jsonb,
  provenance text not null check(provenance in ('command','legacy_import','migration_credit')),
  reverses_event_id uuid unique references public.action_events(id),
  recorded_at timestamptz not null default clock_timestamp(),
  unique(id,relationship_id),
  foreign key(reward_id,relationship_id) references public.rewards(id,relationship_id)
);
create index action_events_period_time on public.action_events(relationship_id,recorded_at,id);
create index action_events_reward on public.action_events(reward_id);
create table public.action_wallets (
  participant_id uuid not null,
  relationship_id uuid not null,
  currency text not null check(currency in ('dom','sub')),
  balance integer not null,
  primary key(participant_id,currency),
  unique(participant_id,relationship_id,currency),
  foreign key(participant_id,relationship_id,currency) references public.relationship_period_members(participant_id,relationship_id,role)
);
create table public.action_point_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  relationship_id uuid not null,
  participant_id uuid not null,
  currency text not null,
  amount integer not null,
  reason text not null check(reason in ('opening_balance','purchase','paid_refund','migration_credit')),
  foreign key(event_id,relationship_id) references public.action_events(id,relationship_id),
  foreign key(participant_id,relationship_id,currency) references public.action_wallets(participant_id,relationship_id,currency)
);
create index action_points_event on public.action_point_entries(event_id);
create index action_points_wallet on public.action_point_entries(participant_id,currency);
create table public.reward_inventory_lots (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null,
  reward_id uuid not null,
  owner_participant_id uuid not null,
  currency text not null,
  acquisition_event_id uuid not null,
  source text not null check(source in ('paid','gift','legacy')),
  paid_price integer,
  refund_value integer not null check(refund_value>=0),
  valuation_id uuid references public.action_accounting_periods(activation_id),
  status text not null default 'available' check(status in ('available','redeemed','cancelled')),
  active_redemption_event_id uuid references public.action_events(id),
  created_at timestamptz not null default clock_timestamp(),
  unique(id,relationship_id),
  check((status='redeemed')=(active_redemption_event_id is not null)),
  check((source='paid' and paid_price is not null and paid_price>=0 and refund_value=paid_price and valuation_id is null) or
        (source='gift' and paid_price is not null and paid_price=0 and refund_value=0 and valuation_id is null) or
        (source='legacy' and paid_price is null and valuation_id is not null)),
  foreign key(reward_id,relationship_id) references public.rewards(id,relationship_id),
  foreign key(acquisition_event_id,relationship_id) references public.action_events(id,relationship_id),
  foreign key(owner_participant_id,relationship_id,currency) references public.action_wallets(participant_id,relationship_id,currency)
);
create index reward_lots_allocate on public.reward_inventory_lots(relationship_id,reward_id,currency,created_at,id) where status='available';
create index reward_lots_acquisition on public.reward_inventory_lots(acquisition_event_id);
create index reward_lots_redemption on public.reward_inventory_lots(active_redemption_event_id) where active_redemption_event_id is not null;
create table public.action_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  relationship_id uuid not null,
  lot_id uuid not null,
  from_status text check(from_status in ('available','redeemed','cancelled')),
  to_status text not null check(to_status in ('available','redeemed','cancelled')),
  unique(event_id,lot_id),
  foreign key(event_id,relationship_id) references public.action_events(id,relationship_id),
  foreign key(lot_id,relationship_id) references public.reward_inventory_lots(id,relationship_id)
);
create index action_movements_lot on public.action_inventory_movements(lot_id);
create table public.action_command_receipts (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_participant_id uuid not null references public.relationship_period_members(participant_id),
  command_id uuid not null unique,
  relationship_id uuid not null references public.relationship_periods(id),
  -- JSONB equality compares the complete canonical intent, without hash collisions.
  payload jsonb not null,
  receipt jsonb not null,
  unique(actor_user_id,command_id)
);
create index action_receipts_period on public.action_command_receipts(relationship_id);
create table public.action_feedback_outbox (
  event_id uuid not null,
  recipient_participant_id uuid not null references public.relationship_period_members(participant_id),
  relationship_id uuid not null,
  kind text not null check(kind in ('action_confirmed','points_refunded')),
  payload jsonb not null,
  primary key(event_id,recipient_participant_id,kind),
  foreign key(event_id,relationship_id) references public.action_events(id,relationship_id)
);
-- Compatibility projection only. Its deletion during Undo does not delete history.
alter table public.reward_usage add column action_event_id uuid unique references public.action_events(id);

-- No new client write path. Period-scoped readers cannot see previous partners.
do $$
declare t text;
begin
  foreach t in array array['action_accounting_periods','action_events','action_wallets','action_point_entries',
    'reward_inventory_lots','action_inventory_movements','action_command_receipts','action_feedback_outbox'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
  foreach t in array array['action_events','action_wallets','action_point_entries','reward_inventory_lots','action_inventory_movements'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy current_action_period on public.%I for select to authenticated using (relationship_id=(select public.current_relationship_id()))',t);
  end loop;
end $$;
grant select(relationship_id,accounting_enabled) on public.action_accounting_periods to authenticated;
create policy own_accounting_status on public.action_accounting_periods for select to authenticated using(relationship_id=(select public.current_relationship_id()));
grant select on public.action_command_receipts,public.action_feedback_outbox to authenticated;
create policy own_action_receipts on public.action_command_receipts for select to authenticated
  using(actor_user_id=(select auth.uid()) and relationship_id=(select public.current_relationship_id()));
create policy own_action_feedback on public.action_feedback_outbox for select to authenticated
  using(relationship_id=(select public.current_relationship_id()) and recipient_participant_id=((select public.get_my_identity())->>'participant_id')::uuid);

-- Append-only business evidence. Service/operator maintenance remains possible;
-- authenticated callers cannot edit these records, including through a definer.
create function public._actions_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  if coalesce(auth.role(),'') in ('authenticated','anon') then
    raise exception using errcode='42501',message='ACTION_HISTORY_IMMUTABLE';
  end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end $$;
do $$ declare t text; begin
  foreach t in array array['action_events','action_point_entries','action_inventory_movements','action_command_receipts','action_feedback_outbox'] loop
    execute format('create trigger immutable_action_evidence before update or delete on public.%I for each row execute function public._actions_immutable()',t);
  end loop;
end $$;

-- Check ledger-backed projections even inside an authenticated SECURITY DEFINER
-- call. Merely running as the migration owner is not authority to change money.
-- Service/operator maintenance is separate; disabled periods retain old behavior.
create function public._actions_legacy_write_guard() returns trigger
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
  elsif TG_TABLE_NAME in ('task_completion_history','rule_violations','punishment_history') then
    -- No legacy definer/direct history append can masquerade as a paid action.
    -- The forthcoming task/rule/punishment command package replaces this branch
    -- with the same event-backed projection checks before operator activation.
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
create trigger atomic_profile_balance_guard before update on public.profiles for each row execute function public._actions_legacy_write_guard();
create trigger atomic_reward_guard before insert or update or delete on public.rewards for each row execute function public._actions_legacy_write_guard();
create trigger atomic_reward_usage_guard before insert or update or delete on public.reward_usage for each row execute function public._actions_legacy_write_guard();
create trigger atomic_task_history_guard before insert or update or delete on public.task_completion_history for each row execute function public._actions_legacy_write_guard();
create trigger atomic_rule_history_guard before insert or update or delete on public.rule_violations for each row execute function public._actions_legacy_write_guard();
create trigger atomic_punishment_history_guard before insert or update or delete on public.punishment_history for each row execute function public._actions_legacy_write_guard();

-- Existing RPC was directly deleting auth.users. Retain disabled-period behavior,
-- but ledger-bearing accounts need the forthcoming retained-history deletion flow.
-- CREATE OR REPLACE preserves its existing execute ACL; no new caller is granted.
create or replace function public.delete_user_account() returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_lock();
  if exists(select 1 from public.relationship_period_members m join public.action_accounting_periods a on a.relationship_id=m.relationship_id
    where m.user_id=auth.uid() and a.accounting_enabled) then
    raise exception using errcode='42501',message='ACCOUNT_DELETION_INTEGRATION_REQUIRED';
  end if;
  delete from auth.users where id=auth.uid();
end $$;

-- This operator-only function is deliberately not called by the migration.
create function public.activate_action_accounting(p_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_count integer; v_activation uuid:=gen_random_uuid(); v_member record; v_reward public.rewards%rowtype;
  v_event uuid; v_owner uuid; v_currency text; v_balance integer; v_lot uuid; v_unit integer; v_snapshot jsonb;
begin
  perform public._identity_lock();
  perform 1 from public.profiles p join public.relationship_period_members m on m.user_id=p.id
    where m.relationship_id=p_relationship_id order by p.id for update of p;
  if not exists(select 1 from public.relationship_periods where id=p_relationship_id and status='active') then
    raise exception using errcode='22023',message='ACTIVE_PERIOD_REQUIRED';
  end if;
  if exists(select 1 from public.action_accounting_periods where relationship_id=p_relationship_id and activation_id is not null) or
     exists(select 1 from public.action_events where relationship_id=p_relationship_id) then
    raise exception using errcode='22023',message='ACCOUNTING_ALREADY_INITIALIZED';
  end if;
  select count(*) into v_count from public.relationship_period_members where relationship_id=p_relationship_id;
  if v_count not in (1,2) or exists(
    select 1 from public.relationship_period_members m
    left join public.profiles p on p.id=m.user_id left join public.identity_contexts c on c.user_id=m.user_id
    where m.relationship_id=p_relationship_id and (p.id is null or p.role<>m.role or c.relationship_id is distinct from p_relationship_id or
      (v_count=2 and public._identity_peer(p.id) is null) or
      (v_count=1 and (p.linked_partner_id is not null or exists(select 1 from public.profiles x where x.linked_partner_id=p.id))))) then
    raise exception using errcode='42501',message='VERIFIED_PERIOD_MEMBERS_REQUIRED';
  end if;
  perform 1 from public.rewards where relationship_id=p_relationship_id order by id for update;
  if exists(select 1 from public.rewards where relationship_id=p_relationship_id and
    (supply is null or supply<0 or cost is null or cost<0 or deleted_at is not null)) then
    raise exception using errcode='22023',message='INVALID_OPENING_INVENTORY';
  end if;
  select jsonb_build_object('capturedAt',clock_timestamp(),'valuationBasis','cutover_catalog_cost',
    'profiles',(select jsonb_agg(jsonb_build_object('id',p.id,'role',p.role,'points',p.points,'dom_points',p.dom_points,'timezone',p.timezone) order by p.id)
      from public.profiles p join public.relationship_period_members m on m.user_id=p.id where m.relationship_id=p_relationship_id),
    'rewards',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.rewards r where r.relationship_id=p_relationship_id),'[]'::jsonb)) into v_snapshot;
  insert into public.action_accounting_periods(relationship_id,activation_id,source_snapshot)
    values(p_relationship_id,v_activation,v_snapshot)
    on conflict(relationship_id) do update set activation_id=excluded.activation_id,source_snapshot=excluded.source_snapshot;
  for v_member in select m.*,p.points,p.dom_points from public.relationship_period_members m join public.profiles p on p.id=m.user_id
    where m.relationship_id=p_relationship_id order by m.participant_id loop
    v_balance:=case when v_member.role='dom' then coalesce(v_member.dom_points,0) else coalesce(v_member.points,0) end;
    insert into public.action_wallets(participant_id,relationship_id,currency,balance)
      values(v_member.participant_id,p_relationship_id,v_member.role,v_balance);
    insert into public.action_events(relationship_id,kind,beneficiary_participant_id,subject,provenance)
      values(p_relationship_id,'opening_balance',v_member.participant_id,
        jsonb_build_object('type','wallet','id',null,'title','Opening balance','role',v_member.role),'legacy_import') returning id into v_event;
    insert into public.action_point_entries(event_id,relationship_id,participant_id,currency,amount,reason)
      values(v_event,p_relationship_id,v_member.participant_id,v_member.role,v_balance,'opening_balance');
  end loop;
  for v_reward in select * from public.rewards where relationship_id=p_relationship_id and supply>0 order by id loop
    v_currency:=case when v_reward.is_dom_reward then 'dom' else 'sub' end;
    select participant_id into v_owner from public.relationship_period_members where relationship_id=p_relationship_id and role=v_currency;
    if v_owner is null then raise exception using errcode='22023',message='OPENING_INVENTORY_OWNER_MISSING'; end if;
    insert into public.action_events(relationship_id,kind,beneficiary_participant_id,reward_id,subject,definition_values,provenance,intent)
      values(p_relationship_id,'opening_inventory',v_owner,v_reward.id,
        jsonb_build_object('type','reward','id',v_reward.id,'title',v_reward.title,'role',v_currency),
        jsonb_build_object('type','reward','cost',v_reward.cost),'legacy_import',
        jsonb_build_object('quantity',v_reward.supply,'valuationId',v_activation,'valuationBasis','cutover_catalog_cost','historicalBuyerKnown',false,'historicalPaidPriceKnown',false)) returning id into v_event;
    for v_unit in 1..v_reward.supply loop
      insert into public.reward_inventory_lots(relationship_id,reward_id,owner_participant_id,currency,acquisition_event_id,source,paid_price,refund_value,valuation_id)
        values(p_relationship_id,v_reward.id,v_owner,v_currency,v_event,'legacy',null,v_reward.cost,v_activation) returning id into v_lot;
      insert into public.action_inventory_movements(event_id,relationship_id,lot_id,to_status) values(v_event,p_relationship_id,v_lot,'available');
    end loop;
  end loop;
  update public.action_accounting_periods set accounting_enabled=true,activated_at=clock_timestamp() where relationship_id=p_relationship_id;
  return jsonb_build_object('relationshipId',p_relationship_id,'activationId',v_activation,'accountingEnabled',true);
end $$;

create function public._actions_require_permission(p_period uuid,p_role text,p_operation text) returns void
language plpgsql security definer set search_path='' as $$
declare v_permission text;
begin
  if p_operation in ('dom_reward_buy','dom_reward_buy_undo','dom_reward_redeem','dom_reward_redeem_undo','reward_gift') then
    if p_role<>'dom' then raise exception using errcode='42501',message='ACTION_NOT_ALLOWED'; end if;
  elsif p_operation in ('sub_reward_buy','sub_reward_buy_undo') then
    if p_role<>'sub' then raise exception using errcode='42501',message='ACTION_NOT_ALLOWED'; end if;
  else
    select permissions->>p_operation into v_permission from public.relationship_periods where id=p_period;
    if v_permission is null or v_permission not in ('both',p_role) then raise exception using errcode='42501',message='ACTION_NOT_ALLOWED'; end if;
  end if;
end $$;

create function public._actions_wallet_delta(p_event uuid,p_period uuid,p_participant uuid,p_currency text,p_amount integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v_balance integer; v_user uuid;
begin
  update public.action_wallets set balance=balance+p_amount
    where participant_id=p_participant and relationship_id=p_period and currency=p_currency returning balance into v_balance;
  if not found then raise exception using errcode='22023',message='WALLET_NOT_FOUND'; end if;
  insert into public.action_point_entries(event_id,relationship_id,participant_id,currency,amount,reason)
    values(p_event,p_period,p_participant,p_currency,p_amount,p_reason);
  select m.user_id into v_user from public.relationship_period_members m join public.identity_contexts c on c.user_id=m.user_id and c.relationship_id=m.relationship_id
    where m.participant_id=p_participant and m.relationship_id=p_period and m.role=p_currency;
  if v_user is null then raise exception using errcode='42501',message='CURRENT_WALLET_OWNER_REQUIRED'; end if;
  if p_currency='dom' then update public.profiles set dom_points=v_balance,updated_at=clock_timestamp() where id=v_user;
  else update public.profiles set points=v_balance,updated_at=clock_timestamp() where id=v_user; end if;
end $$;

create function public._actions_cancel_lot(p_event uuid,p_period uuid,p_lot uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_lot public.reward_inventory_lots%rowtype;
begin
  select * into strict v_lot from public.reward_inventory_lots where id=p_lot and relationship_id=p_period for update;
  if v_lot.status='cancelled' then raise exception using errcode='22023',message='LOT_ALREADY_CANCELLED'; end if;
  update public.reward_inventory_lots set status='cancelled',active_redemption_event_id=null where id=p_lot;
  insert into public.action_inventory_movements(event_id,relationship_id,lot_id,from_status,to_status) values(p_event,p_period,p_lot,v_lot.status,'cancelled');
  -- A zero-cost gift has no point effect and cannot mint currency on cancellation.
  if v_lot.source<>'gift' then
    perform public._actions_wallet_delta(p_event,p_period,v_lot.owner_participant_id,v_lot.currency,v_lot.refund_value,
      case when v_lot.source='legacy' then 'migration_credit' else 'paid_refund' end);
  end if;
end $$;

create function public.execute_reward_command(
  p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_reward_id uuid default null,p_event_id uuid default null,p_inventory_currency text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_period uuid; v_actor uuid; v_role text; v_payload jsonb;
  v_old public.action_command_receipts%rowtype; v_reward public.rewards%rowtype;
  v_lot public.reward_inventory_lots%rowtype; v_original public.action_events%rowtype;
  v_currency text; v_owner uuid; v_recipient uuid; v_owner_user uuid; v_event uuid; v_kind text; v_price integer;
  v_balance integer; v_lot_id uuid; v_refund record; v_receipt jsonb; v_feedback jsonb; v_reason text;
  v_time timestamptz; v_timezone text; v_local_date date; v_calendar jsonb; v_distinct integer;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_command_id is null or p_expected_relationship_id is null or p_action is null or
     p_action not in ('reward_buy','reward_redeem','reward_delete','reward_gift','undo') or
     (p_action='undo' and (p_event_id is null or p_reward_id is not null or p_inventory_currency is not null)) or
     (p_action<>'undo' and (p_reward_id is null or p_event_id is not null)) or
     (p_inventory_currency is not null and (p_action<>'reward_redeem' or p_inventory_currency not in ('sub','dom'))) then
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
  v_payload:=jsonb_build_object('relationshipId',p_expected_relationship_id,'kind',p_action,'rewardId',p_reward_id,'eventId',p_event_id,'inventoryCurrency',p_inventory_currency);
  select * into v_old from public.action_command_receipts where command_id=p_command_id;
  if found then
    if v_old.actor_user_id is distinct from v_user then raise exception using errcode='42501',message='COMMAND_ACTOR_MISMATCH'; end if;
    if v_old.payload<>v_payload then raise exception using errcode='22023',message='COMMAND_ID_REUSED'; end if;
    return v_old.receipt;
  end if;
  if p_action='undo' then
    select * into v_original from public.action_events where id=p_event_id and relationship_id=v_period;
    if not found or v_original.provenance<>'command' or v_original.kind not in ('reward_purchased','reward_redeemed') then
      raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE';
    end if;
    if exists(select 1 from public.action_events where reverses_event_id=p_event_id) then raise exception using errcode='22023',message='ACTION_ALREADY_UNDONE'; end if;
    select * into v_reward from public.rewards where id=v_original.reward_id and relationship_id=v_period for update;
  else
    select * into v_reward from public.rewards where id=p_reward_id and relationship_id=v_period for update;
  end if;
  if v_reward.id is null then raise exception using errcode='22023',message='REWARD_NOT_FOUND'; end if;
  if p_action<>'undo' and v_reward.deleted_at is not null then raise exception using errcode='22023',message='REWARD_DELETED'; end if;
  v_time:=clock_timestamp();
  v_currency:=case when v_reward.is_dom_reward then 'dom' else 'sub' end;
  v_price:=v_reward.cost;
  if p_action in ('reward_buy','reward_gift') then
    if v_price is null or v_price<0 then raise exception using errcode='22023',message='INVALID_REWARD_COST'; end if;
    perform public._actions_require_permission(v_period,v_role,case when p_action='reward_gift' then 'reward_gift' else v_currency||'_reward_buy' end);
    if p_action='reward_gift' and v_currency<>'sub' then raise exception using errcode='42501',message='SUB_REWARD_GIFT_REQUIRED'; end if;
    select participant_id into v_owner from public.relationship_period_members where relationship_id=v_period and role=v_currency;
    if v_owner is null then raise exception using errcode='22023',message='REWARD_OWNER_MISSING'; end if;
    if p_action='reward_buy' then
      select balance into v_balance from public.action_wallets where participant_id=v_owner and currency=v_currency;
      if v_balance is null or v_balance<v_price then raise exception using errcode='22023',message='INSUFFICIENT_POINTS'; end if;
    end if;
    v_kind:=case when p_action='reward_buy' then 'reward_purchased' else 'reward_gifted' end;
  elsif p_action='reward_redeem' then
    select count(distinct currency) into v_distinct from public.reward_inventory_lots where reward_id=v_reward.id and relationship_id=v_period and status='available';
    if p_inventory_currency is null and v_distinct>1 then raise exception using errcode='22023',message='INVENTORY_SELECTION_REQUIRED'; end if;
    -- Current card type is a compatibility default only if there is no ambiguity.
    v_currency:=coalesce(p_inventory_currency,v_currency);
    perform public._actions_require_permission(v_period,v_role,v_currency||'_reward_redeem');
    select * into v_lot from public.reward_inventory_lots where reward_id=v_reward.id and relationship_id=v_period and currency=v_currency and status='available'
      order by created_at,id limit 1 for update;
    if not found then raise exception using errcode='22023',message='NO_AVAILABLE_REWARD'; end if;
    v_owner:=v_lot.owner_participant_id;
    select m.user_id,p.timezone into v_owner_user,v_timezone from public.relationship_period_members m join public.profiles p on p.id=m.user_id
      where m.participant_id=v_owner and m.relationship_id=v_period and m.role=v_currency;
    if v_timezone is null then raise exception using errcode='22023',message='TIMEZONE_REQUIRED'; end if;
    v_local_date:=(v_time at time zone v_timezone)::date;
    v_calendar:=jsonb_build_object('participantId',v_owner,'timeZone',v_timezone,'localDate',v_local_date,
      'weekStartDate',v_local_date-(extract(isodow from v_local_date)::integer-1));
    v_kind:='reward_redeemed';
  elsif p_action='reward_delete' then
    perform public._actions_require_permission(v_period,v_role,'definition_manage');
    v_kind:='reward_deleted'; v_currency:=null;
  else
    if v_original.kind='reward_purchased' then
      select * into v_lot from public.reward_inventory_lots where acquisition_event_id=p_event_id and relationship_id=v_period for update;
      if not found or v_lot.source<>'paid' then raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE'; end if;
      perform public._actions_require_permission(v_period,v_role,v_lot.currency||'_reward_buy_undo');
      if v_actor<>v_original.actor_participant_id or v_actor<>v_lot.owner_participant_id then raise exception using errcode='42501',message='OWN_PURCHASE_REQUIRED'; end if;
      if v_lot.status='redeemed' then raise exception using errcode='22023',message='UNDO_USE_FIRST',detail=jsonb_build_object('dependencyEventId',v_lot.active_redemption_event_id)::text; end if;
      if v_lot.status<>'available' then raise exception using errcode='22023',message='LOT_ALREADY_CANCELLED'; end if;
      v_reason:='purchase_undone';
    else
      select l.* into v_lot from public.reward_inventory_lots l where l.active_redemption_event_id=p_event_id and l.relationship_id=v_period for update;
      if not found or v_lot.status<>'redeemed' then raise exception using errcode='22023',message='REWARD_USE_NOT_ACTIVE'; end if;
      perform public._actions_require_permission(v_period,v_role,v_lot.currency||'_reward_redeem_undo');
      if v_reward.deleted_at is not null then v_reason:='redemption_undone_after_deletion'; end if;
    end if;
    v_owner:=v_lot.owner_participant_id; v_currency:=v_lot.currency; v_kind:='action_undone';
    v_calendar:=v_original.calendar;
  end if;
  insert into public.action_events(relationship_id,command_id,kind,actor_participant_id,beneficiary_participant_id,reward_id,
    subject,definition_values,calendar,intent,provenance,reverses_event_id,recorded_at)
    values(v_period,p_command_id,v_kind,v_actor,v_owner,v_reward.id,
      case when p_action='undo' then v_original.subject else jsonb_build_object('type','reward','id',v_reward.id,'title',v_reward.title,'role',v_currency) end,
      case when p_action='undo' then v_original.definition_values else jsonb_build_object('type','reward','cost',v_price) end,
      v_calendar,v_payload,'command',case when p_action='undo' then p_event_id end,v_time) returning id into v_event;
  if p_action in ('reward_buy','reward_gift') then
    insert into public.reward_inventory_lots(relationship_id,reward_id,owner_participant_id,currency,acquisition_event_id,source,paid_price,refund_value)
      values(v_period,v_reward.id,v_owner,v_currency,v_event,case when p_action='reward_buy' then 'paid' else 'gift' end,
        case when p_action='reward_buy' then v_price else 0 end,case when p_action='reward_buy' then v_price else 0 end) returning id into v_lot_id;
    insert into public.action_inventory_movements(event_id,relationship_id,lot_id,to_status) values(v_event,v_period,v_lot_id,'available');
    if p_action='reward_buy' then perform public._actions_wallet_delta(v_event,v_period,v_owner,v_currency,-v_price,'purchase'); end if;
  elsif p_action='reward_redeem' then
    update public.reward_inventory_lots set status='redeemed',active_redemption_event_id=v_event where id=v_lot.id;
    insert into public.action_inventory_movements(event_id,relationship_id,lot_id,from_status,to_status) values(v_event,v_period,v_lot.id,'available','redeemed');
    insert into public.reward_usage(reward_id,user_id,relationship_id,day_of_week,week_number,used,action_event_id)
      values(v_reward.id,v_owner_user,v_period,extract(isodow from v_local_date)::integer-1,to_char(v_local_date,'IYYY-"W"IW'),true,v_event);
  elsif p_action='reward_delete' then
    update public.rewards set deleted_at=v_time,updated_at=v_time where id=v_reward.id;
    for v_lot_id in select id from public.reward_inventory_lots where reward_id=v_reward.id and relationship_id=v_period and status='available' order by created_at,id for update loop
      perform public._actions_cancel_lot(v_event,v_period,v_lot_id);
    end loop;
    v_reason:='reward_deleted';
  else
    if v_reason is not null then perform public._actions_cancel_lot(v_event,v_period,v_lot.id);
    else
      update public.reward_inventory_lots set status='available',active_redemption_event_id=null where id=v_lot.id;
      insert into public.action_inventory_movements(event_id,relationship_id,lot_id,from_status,to_status) values(v_event,v_period,v_lot.id,'redeemed','available');
    end if;
    if v_original.kind='reward_redeemed' then delete from public.reward_usage where action_event_id=p_event_id; end if;
  end if;
  -- Aggregate supply remains a compatibility projection. Per-owner counts below
  -- are canonical; editing a definition's type never retags existing lots.
  update public.rewards set supply=(select count(*)::integer from public.reward_inventory_lots where reward_id=v_reward.id and status='available'),updated_at=v_time where id=v_reward.id;
  for v_refund in select e.participant_id,e.currency,sum(e.amount)::integer as amount,w.balance
    from public.action_point_entries e join public.action_wallets w on w.participant_id=e.participant_id and w.currency=e.currency
    where e.event_id=v_event and e.reason in ('paid_refund','migration_credit') group by e.participant_id,e.currency,w.balance loop
    if v_refund.amount>0 then
      v_feedback:=jsonb_build_object('eventId',v_event,'recipientParticipantId',v_refund.participant_id,'subjectTitle',v_reward.title,
        'kind','points_refunded','reason',v_reason,'currency',v_refund.currency,'points',v_refund.amount,'balanceAfter',v_refund.balance);
      insert into public.action_feedback_outbox values(v_event,v_refund.participant_id,v_period,'points_refunded',v_feedback);
    end if;
  end loop;
  -- A free gift cancellation still acknowledges removal to its owner. Avoid
  -- duplicating the same recipient's positive refund with a generic notification.
  for v_recipient in select distinct recipient from (
    select coalesce(v_owner,v_actor) as recipient
    union all
    select l.owner_participant_id from public.action_inventory_movements m join public.reward_inventory_lots l on l.id=m.lot_id
      where m.event_id=v_event and m.to_status='cancelled'
  ) recipients loop
    if not exists(select 1 from public.action_feedback_outbox where event_id=v_event and recipient_participant_id=v_recipient and kind='points_refunded') then
      insert into public.action_feedback_outbox values(v_event,v_recipient,v_period,'action_confirmed',
        jsonb_build_object('eventId',v_event,'recipientParticipantId',v_recipient,'subjectTitle',v_reward.title,'kind','action_confirmed'));
    end if;
  end loop;
  select jsonb_build_object('commandId',p_command_id,'relationshipId',v_period,'eventIds',jsonb_build_array(v_event),'confirmedAt',clock_timestamp(),
    'inventorySelection',case when p_action='reward_redeem' then jsonb_build_object('requestedCurrency',p_inventory_currency,'allocatedCurrency',v_currency) else null end,
    'balances',(select coalesce(jsonb_agg(jsonb_build_object('participantId',participant_id,'currency',currency,'balance',balance) order by currency),'[]'::jsonb) from public.action_wallets where relationship_id=v_period),
    'availableRewardQuantities',(select coalesce(jsonb_agg(jsonb_build_object('rewardId',v_reward.id,'ownerParticipantId',m.participant_id,'currency',m.role,'quantity',
      (select count(*) from public.reward_inventory_lots l where l.reward_id=v_reward.id and l.owner_participant_id=m.participant_id and l.status='available')) order by m.role),'[]'::jsonb)
      from public.relationship_period_members m where m.relationship_id=v_period),
    'refunds',(select coalesce(jsonb_agg(jsonb_build_object('participantId',r.participant_id,'currency',r.currency,'paidPoints',r.paid,'migrationCredit',r.credit,'total',r.paid+r.credit) order by r.currency),'[]'::jsonb)
      from (select participant_id,currency,coalesce(sum(amount) filter(where reason='paid_refund'),0) as paid,coalesce(sum(amount) filter(where reason='migration_credit'),0) as credit
        from public.action_point_entries where event_id=v_event and reason in ('paid_refund','migration_credit') group by participant_id,currency) r),
    'feedback',(select jsonb_agg(payload order by recipient_participant_id,kind) from public.action_feedback_outbox where event_id=v_event)) into v_receipt;
  insert into public.action_command_receipts(actor_user_id,actor_participant_id,command_id,relationship_id,payload,receipt)
    values(v_user,v_actor,p_command_id,v_period,v_payload,v_receipt);
  return v_receipt;
end $$;

revoke all on function public._actions_immutable(),public._actions_legacy_write_guard(),
  public.activate_action_accounting(uuid),public._actions_require_permission(uuid,text,text),
  public._actions_wallet_delta(uuid,uuid,uuid,text,integer,text),public._actions_cancel_lot(uuid,uuid,uuid),
  public.execute_reward_command(uuid,uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.activate_action_accounting(uuid) to service_role;
grant execute on function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text) to authenticated;

comment on table public.action_accounting_periods is 'Activation-time opening snapshot. Accounting stays disabled until reviewed operator activation; lifecycle_ready is a different gate.';
comment on column public.reward_inventory_lots.refund_value is 'Exact paid points for new purchases; zero for gifts; frozen cutover catalog migration credit for legacy inventory, never a claim about historical payment.';
comment on column public.rewards.deleted_at is 'Atomic cancellation/refund tombstone. History and redeemed lots survive definition deletion.';
notify pgrst,'reload schema';
commit;
