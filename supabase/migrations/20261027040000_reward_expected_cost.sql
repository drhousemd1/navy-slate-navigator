-- Bind queued purchases to the price the user reviewed. No account activation,
-- data rewrite, or historical migration editing occurs here.
begin;

-- The prior callable overload must not remain as a path around the precondition.
-- RESTRICT is intentional: an unexpected dependency fails this whole migration
-- instead of cascading into unrelated objects. PL/pgSQL undo_action's six-arg
-- call resolves to the new signature through the optional final argument.
revoke all on function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text) from public,anon,authenticated;
drop function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text);

create function public.execute_reward_command(
  p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_reward_id uuid default null,p_event_id uuid default null,p_inventory_currency text default null,
  p_expected_cost integer default null
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
     (p_inventory_currency is not null and (p_action<>'reward_redeem' or p_inventory_currency not in ('sub','dom'))) or
     (p_action<>'reward_buy' and p_expected_cost is not null) then
    raise exception using errcode='22023',message='INVALID_ACTION_COMMAND';
  end if;
  if p_action='reward_buy' and p_expected_cost is null then
    raise exception using errcode='22023',message='EXPECTED_REWARD_COST_REQUIRED';
  end if;
  if p_action='reward_buy' and p_expected_cost<0 then
    raise exception using errcode='22023',message='INVALID_EXPECTED_REWARD_COST';
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
  -- Preserve existing non-Buy payloads. A Buy's displayed-price consent is part
  -- of its immutable intent; retrying cannot silently accept another price.
  if p_action='reward_buy' then v_payload:=v_payload||jsonb_build_object('expectedCost',p_expected_cost); end if;
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
      -- The row is locked and the authoritative current cost is server-derived.
      -- This check is AFTER receipt replay, so later edits cannot alter an
      -- already-confirmed command's result or charge it again.
      if p_expected_cost<>v_price then
        raise exception using errcode='22023',message='REWARD_COST_CHANGED',
          detail=jsonb_build_object('expectedCost',p_expected_cost,'currentCost',v_price)::text;
      end if;
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

revoke all on function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text,integer) to authenticated;
comment on function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text,integer) is
  'Atomic reward command. Buy requires the reviewed expected cost; current cost and all effects remain server-owned. Existing confirmed identical commands replay their saved receipt.';
notify pgrst,'reload schema';
commit;
