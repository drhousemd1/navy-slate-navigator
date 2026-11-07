-- Explicit solo-role choices. No existing account activation, role rewrite,
-- currency conversion, inventory transfer or account-deletion gate change.
begin;

create table public.solo_role_change_receipts (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  command_id uuid not null,
  intent jsonb not null,
  receipt jsonb not null,
  completed_at timestamptz not null,
  primary key(actor_user_id,command_id)
);
alter table public.solo_role_change_receipts enable row level security;
revoke all on public.solo_role_change_receipts from public,anon,authenticated;
grant select,insert,update,delete on public.solo_role_change_receipts to service_role;
comment on table public.solo_role_change_receipts is
  'Private actor-only role transition receipts. No survivor retention: removed with Auth account. Period references are historical JSON, not deletion-blocking foreign keys.';

create function public._solo_role_require_current(p_period uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i jsonb;
begin
  perform public._identity_require_session(p_period,p_session);
  i:=public.get_my_identity();
  if i->>'status'='ready_linked' then raise exception using errcode='22023',message='UNLINK_BEFORE_ROLE_CHANGE'; end if;
  if i->>'status' is distinct from 'ready_solo' or
    (select count(*) from public.relationship_period_members where relationship_id=p_period)<>1 or
    not exists(select 1 from public.relationship_period_members where relationship_id=p_period and user_id=auth.uid() and role=i->>'role') or
    exists(select 1 from public.profiles where linked_partner_id=auth.uid()) then
    raise exception using errcode='42501',message='VALID_IDENTITY_REQUIRED'; end if;
  perform public._identity_require_lifecycle(auth.uid());
  perform public._identity_require_accounting(p_period);
  return i;
end $$;

-- Called only behind checked public RPCs. The opaque digest is a review token,
-- never authority; every request independently verifies current/saved ownership.
create function public._solo_role_summary(p_actor uuid,p_period uuid,p_role text,p_status text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('periodId',r.id,'role',m.role,'startedAt',r.started_at,'endedAt',r.ended_at,
    'balance',w.balance,'availableUses',inventory.available_uses,
    'reviewToken',encode(extensions.digest(jsonb_build_object('v',1,'actor',p_actor,'period',r.id,
      'session',r.relationship_session_id,'status',r.status,'participant',m.participant_id,'role',m.role,
      'wallet',to_jsonb(w),'inventory',inventory.contents)::text,'sha256'),'hex'))
  from public.relationship_periods r
    join public.relationship_period_members m on m.relationship_id=r.id and m.user_id=p_actor and m.role=p_role
    join public.action_accounting_periods a on a.relationship_id=r.id and a.accounting_enabled and a.activation_id is not null
    join public.action_wallets w on w.relationship_id=r.id and w.participant_id=m.participant_id and w.currency=m.role
    cross join lateral (select count(*) filter(where l.status='available') as available_uses,
      coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) as contents
      from public.reward_inventory_lots l where l.relationship_id=r.id and l.owner_participant_id=m.participant_id and l.currency=m.role) inventory
  where r.id=p_period and r.status=p_status
    and (select count(*) from public.relationship_period_members x where x.relationship_id=r.id)=1;
$$;

create function public.get_my_role_change_options(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,p_role text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i jsonb; current_state jsonb; saved_states jsonb;
begin
  i:=public._solo_role_require_current(p_expected_relationship_id,p_expected_relationship_session_id);
  if p_role is null or p_role not in ('dom','sub') then raise exception using errcode='22023',message='INVALID_PROFILE_ROLE'; end if;
  current_state:=public._solo_role_summary(auth.uid(),p_expected_relationship_id,i->>'role','active');
  if current_state is null then raise exception using errcode='55000',message='LIFECYCLE_WALLET_MISSING'; end if;
  select coalesce(jsonb_agg(s.value order by r.ended_at desc nulls last,r.started_at desc,r.id desc),'[]'::jsonb) into saved_states
    from public.relationship_periods r
    join public.relationship_period_members m on m.relationship_id=r.id and m.user_id=auth.uid() and m.role=p_role
    cross join lateral (select public._solo_role_summary(auth.uid(),r.id,p_role,'archived') as value) s
    where r.status='archived' and r.id<>p_expected_relationship_id and s.value is not null;
  return jsonb_build_object('scope',jsonb_build_object('accountId',auth.uid(),'relationshipId',p_expected_relationship_id,
    'relationshipSessionId',p_expected_relationship_session_id),'role',p_role,
    'current',current_state-'startedAt'-'endedAt'-'reviewToken','currentReviewToken',current_state->>'reviewToken','saved',saved_states);
end $$;

create function public.get_my_role_change_result(p_command_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select receipt into result from public.solo_role_change_receipts where actor_user_id=auth.uid() and command_id=p_command_id;
  return jsonb_build_object('receipt',result);
end $$;

create function public.change_my_role(p_command_id uuid,p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,
  p_role text,p_mode text,p_saved_period_id uuid,p_current_review_token text,p_destination_review_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); intent jsonb; previous public.solo_role_change_receipts%rowtype;
  i jsonb; current_state jsonb; destination_state jsonb; destination uuid; destination_session uuid;
  completed timestamptz; result jsonb;
begin
  if actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_command_id is null then raise exception using errcode='22023',message='COMMAND_ID_REQUIRED'; end if;
  perform public._identity_lock();
  intent:=jsonb_build_object('fromPeriod',p_expected_relationship_id,'fromSession',p_expected_relationship_session_id,
    'role',p_role,'mode',p_mode,'savedPeriod',p_saved_period_id,'currentReview',p_current_review_token,'destinationReview',p_destination_review_token);
  select * into previous from public.solo_role_change_receipts where actor_user_id=actor and command_id=p_command_id;
  if previous.command_id is not null then
    if previous.intent is distinct from intent then raise exception using errcode='22023',message='ROLE_TRANSITION_ID_REUSED'; end if;
    return previous.receipt; -- Exact accepted result, NOT a claim it is still current.
  end if;
  i:=public._solo_role_require_current(p_expected_relationship_id,p_expected_relationship_session_id);
  if p_role is null or p_role not in ('dom','sub') then raise exception using errcode='22023',message='INVALID_PROFILE_ROLE'; end if;
  if p_mode is null or p_mode not in ('fresh','resume') or
    (p_mode='fresh' and (p_saved_period_id is not null or p_destination_review_token is not null)) or
    (p_mode='resume' and p_saved_period_id is null) then
    raise exception using errcode='22023',message='INVALID_ROLE_TRANSITION_MODE'; end if;
  if p_mode='fresh' and p_role=i->>'role' then raise exception using errcode='22023',message='ROLE_CHANGE_NOT_REQUIRED'; end if;
  -- All native action and lifecycle writers share _identity_lock. Row locks also
  -- protect the checked profile/wallet snapshots during this transaction.
  perform 1 from public.profiles where id=actor for update;
  perform 1 from public.action_wallets where relationship_id=p_expected_relationship_id for update;
  current_state:=public._solo_role_summary(actor,p_expected_relationship_id,i->>'role','active');
  if current_state is null then raise exception using errcode='55000',message='LIFECYCLE_WALLET_MISSING'; end if;
  if p_current_review_token is distinct from current_state->>'reviewToken' then
    raise exception using errcode='22023',message='ROLE_REVIEW_CHANGED'; end if;
  if p_mode='resume' then
    destination_state:=public._solo_role_summary(actor,p_saved_period_id,p_role,'archived');
    if destination_state is null then raise exception using errcode='42501',message='ROLE_SAVED_PERIOD_UNAVAILABLE'; end if;
    perform 1 from public.action_wallets where relationship_id=p_saved_period_id for update;
    destination_state:=public._solo_role_summary(actor,p_saved_period_id,p_role,'archived');
    if destination_state is null then raise exception using errcode='42501',message='ROLE_SAVED_PERIOD_UNAVAILABLE'; end if;
    if p_destination_review_token is distinct from destination_state->>'reviewToken' then
      raise exception using errcode='22023',message='ROLE_REVIEW_CHANGED'; end if;
    destination:=p_saved_period_id;
  end if;

  perform public._identity_project_current_wallet(actor);
  perform public._identity_archive(p_expected_relationship_id);
  if p_mode='fresh' then
    insert into public.relationship_periods default values returning id,relationship_session_id into destination,destination_session;
    insert into public.relationship_period_members(relationship_id,user_id,role) values(destination,actor,p_role);
  else
    update public.relationship_periods set status='active',ended_at=null,relationship_session_id=pg_catalog.gen_random_uuid()
      where id=destination returning relationship_session_id into destination_session;
  end if;
  -- Switch context before projecting balances. Never modify an old member role.
  update public.identity_contexts set relationship_id=destination where user_id=actor;
  update public.profiles set role=p_role where id=actor;
  if p_mode='fresh' then
    -- The opposite legacy profile column is not another wallet. Initialize only
    -- the new role's projection to ZERO before the existing empty-period opener.
    if p_role='dom' then update public.profiles set dom_points=0 where id=actor;
    else update public.profiles set points=0 where id=actor; end if;
    perform public.activate_action_accounting(destination);
  else
    perform public._identity_project_current_wallet(actor);
  end if;
  delete from public.partner_link_invitations where user_id=actor;
  completed:=clock_timestamp();
  result:=jsonb_build_object('commandId',p_command_id,'accountId',actor,
    'from',jsonb_build_object('periodId',p_expected_relationship_id,'sessionId',p_expected_relationship_session_id),
    'to',jsonb_build_object('periodId',destination,'sessionId',destination_session,'role',p_role),'completedAt',completed);
  insert into public.solo_role_change_receipts(actor_user_id,command_id,intent,receipt,completed_at) values(actor,p_command_id,intent,result,completed);
  return result;
end $$;

revoke all on function public._solo_role_require_current(uuid,uuid),public._solo_role_summary(uuid,uuid,text,text),
  public.get_my_role_change_options(uuid,uuid,text),public.get_my_role_change_result(uuid),
  public.change_my_role(uuid,uuid,uuid,text,text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.get_my_role_change_options(uuid,uuid,text),public.get_my_role_change_result(uuid),
  public.change_my_role(uuid,uuid,uuid,text,text,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
