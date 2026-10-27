-- STAGED. This changes no lifecycle/accounting readiness flags and activates no
-- existing account. Masked archives, private media, retained-account deletion,
-- role switching and generation-aware clients remain release dependencies.
begin;

-- An accounting activation freezes an opening valuation ONCE. This separate
-- generation changes every time the same retained period becomes current again.
alter table public.relationship_periods add column relationship_session_id uuid not null default pg_catalog.gen_random_uuid();
alter table public.relationship_periods add constraint relationship_session_unique unique(relationship_session_id);
alter table public.partner_link_invitations add column relationship_session_id uuid;
alter table public.action_command_receipts add column relationship_session_id uuid;
comment on column public.action_command_receipts.relationship_session_id is
  'Session that accepted a new command; NULL means a receipt predating generation enforcement. Never inferred or rewritten.';

-- Preserve the function OID: existing feedback RLS policies reference it.
create or replace function public.get_my_identity() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); p public.profiles%rowtype; peer public.profiles%rowtype;
  c public.identity_contexts%rowtype; r public.relationship_periods%rowtype;
  v_status text; v_participant uuid; v_code text; v_sub uuid; v_dom uuid;
begin
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  select * into p from public.profiles where id = v_actor;
  select * into c from public.identity_contexts where user_id = v_actor;
  select * into r from public.relationship_periods where id = c.relationship_id;
  select participant_id into v_participant from public.relationship_period_members
    where relationship_id = c.relationship_id and user_id = v_actor;
  if p.id is null then v_status := 'missing_profile';
  elsif p.role not in ('dom','sub') or p.role is null then v_status := 'invalid_role';
  elsif p.linked_partner_id is null then
    if public.current_relationship_id() is null then v_status := 'incomplete_partner';
    else v_status := 'ready_solo'; end if;
  elsif p.linked_partner_id = p.id then v_status := 'invalid_partner';
  else
    select * into peer from public.profiles where id = p.linked_partner_id;
    if peer.id is null or peer.role not in ('dom','sub') then v_status := 'invalid_partner';
    elsif peer.linked_partner_id is distinct from p.id then v_status := 'incomplete_partner';
    elsif peer.role = p.role then v_status := 'same_role';
    elsif public._identity_peer(v_actor) is null then v_status := 'incomplete_partner';
    else v_status := 'ready_linked'; end if;
  end if;
  if v_status in ('ready_solo','ready_linked') then
    if p.role = 'dom' then v_dom := p.id; else v_sub := p.id; end if;
    if v_status = 'ready_linked' then
      if peer.role = 'dom' then v_dom := peer.id; else v_sub := peer.id; end if;
    else
      select code into v_code from public.partner_link_invitations where user_id = v_actor;
    end if;
  end if;
  return jsonb_build_object('status',v_status,'user_id',v_actor,'role',p.role,
    'linked_partner_id',p.linked_partner_id,'partner_role',peer.role,
    'sub_user_id',v_sub,'dom_user_id',v_dom,'relationship_id',c.relationship_id,
    'relationship_status',r.status,'participant_id',v_participant,
    'relationship_session_id',case when r.status='active' and v_participant is not null then r.relationship_session_id end,
    'permissions',coalesce(r.permissions,'{}'::jsonb),'lifecycle_ready',coalesce(c.lifecycle_ready,false),
    'timezone',p.timezone,'partner_link_code',v_code);
end;
$$;

-- Also accepts an owned, active but malformed context for the narrowly scoped
-- unlink repair. Action implementations separately require a valid pair/solo.
create function public._identity_require_session(p_period uuid,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._identity_lock();
  if p_period is null or not exists(select 1 from public.identity_contexts c
    join public.relationship_period_members m on m.relationship_id=c.relationship_id and m.user_id=c.user_id
    join public.relationship_periods r on r.id=c.relationship_id and r.status='active'
    where c.user_id=auth.uid() and c.relationship_id=p_period) then
    raise exception using errcode='42501',message='STALE_RELATIONSHIP';
  end if;
  if p_session is null or not exists(select 1 from public.relationship_periods
    where id=p_period and relationship_session_id=p_session) then
    raise exception using errcode='42501',message='STALE_RELATIONSHIP_SESSION';
  end if;
end $$;

create function public._identity_require_accounting(p_period uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.action_accounting_periods
    where relationship_id=p_period and accounting_enabled and activation_id is not null) then
    raise exception using errcode='55000',message='LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED';
  end if;
  if exists(select 1 from public.relationship_period_members m left join public.action_wallets w
    on w.participant_id=m.participant_id and w.relationship_id=m.relationship_id and w.currency=m.role
    where m.relationship_id=p_period and w.participant_id is null) then
    raise exception using errcode='55000',message='LIFECYCLE_WALLET_MISSING';
  end if;
end $$;

-- A link invitation is consent for the creator's current generation only. Old
-- pre-migration invitations must be rotated; this migration does not consume any.
create function public._identity_stamp_invitation_session() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select r.relationship_session_id into strict NEW.relationship_session_id
    from public.identity_contexts c join public.relationship_periods r on r.id=c.relationship_id
    where c.user_id=NEW.user_id and r.status='active';
  return NEW;
end $$;
create trigger invitation_session before insert or update on public.partner_link_invitations
for each row execute function public._identity_stamp_invitation_session();

alter function public.generate_partner_link_code(uuid,text,uuid) rename to _identity_generate_code_without_session;
revoke all on function public._identity_generate_code_without_session(uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.generate_partner_link_code(p_expected_relationship_id uuid,p_mode text default 'fresh',
  p_previous_relationship_id uuid default null,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._identity_require_lifecycle(auth.uid());
  perform public._identity_require_accounting(p_expected_relationship_id);
  -- The existing generator checks ownership/archived membership BEFORE the
  -- private accounting lookup, so this cannot enumerate another pair's gate.
  v_result:=public._identity_generate_code_without_session(p_expected_relationship_id,p_mode,p_previous_relationship_id);
  if p_mode='continue' then perform public._identity_require_accounting(p_previous_relationship_id); end if;
  return v_result;
end $$;

-- Project only the person's own currency. The unused opposite-role legacy
-- column is not a second wallet and is never imported as an active balance.
create function public._identity_project_current_wallet(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_balance integer;
begin
  select w.currency,w.balance into strict v_role,v_balance from public.identity_contexts c
    join public.relationship_period_members m on m.relationship_id=c.relationship_id and m.user_id=c.user_id
    join public.action_wallets w on w.relationship_id=m.relationship_id and w.participant_id=m.participant_id and w.currency=m.role
    where c.user_id=p_user;
  if v_role='sub' then update public.profiles set points=v_balance where id=p_user and points is distinct from v_balance;
  else update public.profiles set dom_points=v_balance where id=p_user and dom_points is distinct from v_balance; end if;
end $$;

-- Source ledgers remain immutable; solo balances get one new opening snapshot.
-- There is no intermediate committed context without initialized accounting.
alter function public.unlink_my_partner(uuid) rename to _identity_unlink_without_accounting;
revoke all on function public._identity_unlink_without_accounting(uuid) from public,anon,authenticated,service_role;
create function public.unlink_my_partner(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_member record; v_users uuid[]; v_user uuid;
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._identity_require_lifecycle(auth.uid());
  perform public._identity_require_accounting(p_expected_relationship_id);
  select array_agg(m.user_id order by m.user_id) into v_users from public.relationship_period_members m
    join public.identity_contexts c on c.user_id=m.user_id and c.relationship_id=m.relationship_id
    where m.relationship_id=p_expected_relationship_id;
  perform 1 from public.profiles where id=any(v_users) order by id for update;
  foreach v_user in array v_users loop
    perform public._identity_project_current_wallet(v_user);
  end loop;
  perform public._identity_unlink_without_accounting(p_expected_relationship_id);
  for v_member in select distinct c.relationship_id from public.identity_contexts c
    where c.user_id=any(v_users) and c.relationship_id<>p_expected_relationship_id loop
    perform public.activate_action_accounting(v_member.relationship_id);
  end loop;
  return public.get_my_identity();
end $$;

drop function public.accept_partner_link_code(uuid,text,text,uuid);
create function public.accept_partner_link_code(p_expected_relationship_id uuid,p_code text,p_mode text,
  p_previous_relationship_id uuid default null,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); inv public.partner_link_invitations%rowtype;
  a public.profiles%rowtype; b public.profiles%rowtype; v_period uuid; v_old uuid; v_creator_session uuid;
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public.preview_partner_link_code(p_code);
  select * into strict inv from public.partner_link_invitations where code=upper(btrim(p_code));
  perform public._identity_require_lifecycle(v_actor);
  perform public._identity_require_lifecycle(inv.user_id);
  perform 1 from public.profiles where id in(v_actor,inv.user_id) order by id for update;
  select * into a from public.profiles where id=v_actor;
  select * into b from public.profiles where id=inv.user_id;
  if a.id is null or b.id is null or a.role not in('dom','sub') or b.role not in('dom','sub') then
    raise exception using errcode='22023',message='PROFILE_SETUP_REQUIRED'; end if;
  if a.role=b.role then raise exception using errcode='22023',message='SAME_ROLE'; end if;
  if public.current_relationship_id() is distinct from p_expected_relationship_id or
     not exists(select 1 from public.identity_contexts c join public.relationship_period_members m
       on m.relationship_id=c.relationship_id and m.user_id=c.user_id and m.role=b.role where c.user_id=b.id) or
     a.linked_partner_id is not null or b.linked_partner_id is not null or
     exists(select 1 from public.profiles where linked_partner_id in(a.id,b.id)) or
     exists(select 1 from public.identity_contexts c where c.user_id in(a.id,b.id) and
       (select count(*) from public.relationship_period_members m where m.relationship_id=c.relationship_id)<>1) then
    raise exception using errcode='22023',message='ALREADY_LINKED_OR_INCOMPLETE'; end if;
  select r.relationship_session_id into v_creator_session from public.identity_contexts c
    join public.relationship_periods r on r.id=c.relationship_id and r.status='active' where c.user_id=b.id;
  if inv.relationship_session_id is null or inv.relationship_session_id is distinct from v_creator_session then
    raise exception using errcode='22023',message='LINK_INVITATION_STALE'; end if;
  if p_mode is distinct from inv.mode or p_previous_relationship_id is distinct from inv.previous_relationship_id then
    raise exception using errcode='22023',message='CONSENT_MISMATCH'; end if;
  for v_old in select distinct relationship_id from public.identity_contexts where user_id in(a.id,b.id) loop
    perform public._identity_require_accounting(v_old);
  end loop;
  if inv.mode='continue' then
    v_period:=inv.previous_relationship_id;
    if not exists(select 1 from public.relationship_periods where id=v_period and status='archived') or
       (select count(*) from public.relationship_period_members where relationship_id=v_period)<>2 or
       not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=a.id and role=a.role) or
       not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=b.id and role=b.role) then
      raise exception using errcode='22023',message='PREVIOUS_RELATIONSHIP_CHANGED'; end if;
    perform public._identity_require_accounting(v_period);
  end if;
  perform public._identity_project_current_wallet(a.id);
  perform public._identity_project_current_wallet(b.id);
  for v_old in select distinct relationship_id from public.identity_contexts where user_id in(a.id,b.id) loop
    perform public._identity_archive(v_old);
  end loop;
  if inv.mode='continue' then
    update public.relationship_periods set status='active',ended_at=null,
      relationship_session_id=pg_catalog.gen_random_uuid() where id=v_period;
  else
    insert into public.relationship_periods default values returning id into v_period;
    insert into public.relationship_period_members(relationship_id,user_id,role)
      values(v_period,a.id,a.role),(v_period,b.id,b.role);
  end if;
  -- Change context BEFORE its profile projection. The accounting guard now
  -- validates against the destination ledger rather than the departing wallet.
  update public.identity_contexts set relationship_id=v_period where user_id in(a.id,b.id);
  update public.profiles set linked_partner_id=case when id=a.id then b.id else a.id end where id in(a.id,b.id);
  if inv.mode='continue' then
    perform public._identity_project_current_wallet(a.id);
    perform public._identity_project_current_wallet(b.id);
  else
    update public.profiles set points=0,dom_points=0 where id in(a.id,b.id);
    perform public.activate_action_accounting(v_period);
  end if;
  delete from public.partner_link_invitations where user_id in(a.id,b.id);
  return public.get_my_identity();
end $$;

alter function public.set_relationship_permissions(jsonb,uuid) rename to _identity_permissions_without_session;
revoke all on function public._identity_permissions_without_session(jsonb,uuid) from public,anon,authenticated,service_role;
create function public.set_relationship_permissions(p_permissions jsonb,p_expected_relationship_id uuid,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  return public._identity_permissions_without_session(p_permissions,p_expected_relationship_id);
end $$;

-- Role switching cannot rewrite a participant role referenced by their wallet.
-- Initial setup and same-role calls are preserved; a later role-lifecycle slice
-- must specify distinct period/balance behavior rather than invent it here.
alter function public.set_my_profile_role(text) rename to _identity_set_role_before_accounting;
revoke all on function public._identity_set_role_before_accounting(text) from public,anon,authenticated,service_role;
create function public.set_my_profile_role(p_role text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  perform public._identity_lock();
  v_role:=case lower(btrim(p_role)) when 'dom' then 'dom' when 'dominant' then 'dom' when 'sub' then 'sub' when 'submissive' then 'sub' end;
  if v_role is not null and exists(select 1 from public.profiles p join public.identity_contexts c on c.user_id=p.id
    join public.action_accounting_periods a on a.relationship_id=c.relationship_id and a.accounting_enabled
    where p.id=auth.uid() and p.role is distinct from v_role) then
    raise exception using errcode='55000',message='ROLE_LIFECYCLE_INTEGRATION_REQUIRED';
  end if;
  return public._identity_set_role_before_accounting(p_role);
end $$;

-- New receipts carry their accepting generation. Historical receipts stay byte
-- unchanged. No receipt or event is updated to manufacture migration provenance.
create function public._actions_stamp_receipt_session() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select relationship_session_id into strict NEW.relationship_session_id from public.relationship_periods where id=NEW.relationship_id;
  NEW.receipt:=NEW.receipt||jsonb_build_object('relationshipSessionId',NEW.relationship_session_id);
  return NEW;
end $$;
create trigger action_receipt_session before insert on public.action_command_receipts
for each row execute function public._actions_stamp_receipt_session();

-- Explicit receipt recovery is a read. It cannot retry an unconfirmed old intent.
-- It reveals only the signed-in actor's exact receipt, never a partner's command.
create function public.get_my_action_receipt(p_command_id uuid,p_expected_relationship_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select r.receipt into v_result from public.action_command_receipts r
    join public.relationship_period_members m on m.participant_id=r.actor_participant_id and m.relationship_id=r.relationship_id
    where r.command_id=p_command_id and r.relationship_id=p_expected_relationship_id
      and r.actor_user_id=auth.uid() and m.user_id=auth.uid();
  return v_result; -- NULL means no receipt owned by this caller; no enumeration.
end $$;

-- Keep already-reviewed accounting bodies as private implementations. All public
-- entry points check generation under the SAME transaction lock before dispatch.
alter function public.execute_reward_command(uuid,uuid,text,uuid,uuid,text,integer) rename to _execute_reward_before_session;
alter function public.execute_task_command(uuid,uuid,text,uuid,uuid) rename to _execute_task_before_session;
alter function public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid) rename to _execute_recording_before_session;
revoke all on function public._execute_reward_before_session(uuid,uuid,text,uuid,uuid,text,integer),
  public._execute_task_before_session(uuid,uuid,text,uuid,uuid),public._execute_recording_before_session(uuid,uuid,text,uuid,uuid,uuid)
  from public,anon,authenticated,service_role;

create function public.execute_reward_command(p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_reward_id uuid default null,p_event_id uuid default null,p_inventory_currency text default null,p_expected_cost integer default null,
  p_expected_relationship_session_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._execute_reward_before_session(p_command_id,p_expected_relationship_id,p_action,p_reward_id,p_event_id,p_inventory_currency,p_expected_cost);
  return public.get_my_action_receipt(p_command_id,p_expected_relationship_id);
end $$;
create function public.execute_task_command(p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_task_id uuid default null,p_event_id uuid default null,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._execute_task_before_session(p_command_id,p_expected_relationship_id,p_action,p_task_id,p_event_id);
  return public.get_my_action_receipt(p_command_id,p_expected_relationship_id);
end $$;
create function public.execute_recording_command(p_command_id uuid,p_expected_relationship_id uuid,p_action text,
  p_rule_id uuid default null,p_punishment_id uuid default null,p_event_id uuid default null,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._execute_recording_before_session(p_command_id,p_expected_relationship_id,p_action,p_rule_id,p_punishment_id,p_event_id);
  return public.get_my_action_receipt(p_command_id,p_expected_relationship_id);
end $$;

drop function public.undo_action(uuid,uuid,uuid);
create function public.undo_action(p_command_id uuid,p_expected_relationship_id uuid,p_event_id uuid,p_expected_relationship_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_kind text;
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  if public.current_relationship_id() is distinct from p_expected_relationship_id then
    raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  select kind into v_kind from public.action_events where id=p_event_id and relationship_id=p_expected_relationship_id;
  if v_kind='task_completed' then
    return public.execute_task_command(p_command_id,p_expected_relationship_id,'undo',null,p_event_id,p_expected_relationship_session_id);
  elsif v_kind in('reward_purchased','reward_redeemed') then
    return public.execute_reward_command(p_command_id,p_expected_relationship_id,'undo',null,p_event_id,null,null,p_expected_relationship_session_id);
  elsif v_kind in('rule_violated','punishment_applied') then
    return public.execute_recording_command(p_command_id,p_expected_relationship_id,'undo',null,null,p_event_id,p_expected_relationship_session_id);
  else raise exception using errcode='22023',message='ACTION_NOT_REVERSIBLE'; end if;
end $$;

alter function public.acknowledge_action_feedback(uuid,uuid,text) rename to _acknowledge_feedback_before_session;
revoke all on function public._acknowledge_feedback_before_session(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.acknowledge_action_feedback(p_expected_relationship_id uuid,p_event_id uuid,p_kind text,
  p_expected_relationship_session_id uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  perform public._acknowledge_feedback_before_session(p_expected_relationship_id,p_event_id,p_kind);
end $$;

-- Direct row edits cannot bypass generation by retaining the old period UUID.
-- BEFORE STATEMENT takes the lock before row locks, matching command lock order.
-- SECURITY INVOKER deliberately distinguishes direct authenticated SQL from the
-- owner-only command bodies. Supplying a header never grants identity/row access.
create function public._identity_guard_direct_session() returns trigger
language plpgsql set search_path='' as $$
declare v_period uuid; v_session text;
begin
  if current_user not in('authenticated','anon') then return null; end if;
  v_period:=public.current_relationship_id();
  if exists(select 1 from public.action_accounting_periods where relationship_id=v_period and accounting_enabled) then
    v_session:=nullif(current_setting('request.headers',true),'')::jsonb->>'x-relationship-session-id';
    if v_session is null or v_session!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using errcode='42501',message='STALE_RELATIONSHIP_SESSION'; end if;
    perform public._identity_require_session(v_period,v_session::uuid);
  end if;
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['rules','tasks','rewards','punishments','rule_violations','task_completion_history',
    'reward_usage','punishment_history','wellbeing_snapshots','messages','archived_messages'] loop
    execute format('create trigger identity_direct_session before insert or update or delete on public.%I for each statement execute function public._identity_guard_direct_session()',t);
  end loop;
end $$;

revoke all on function public.get_my_identity(),public._identity_require_session(uuid,uuid),public._identity_require_accounting(uuid),
  public._identity_stamp_invitation_session(),public._identity_project_current_wallet(uuid),public._actions_stamp_receipt_session(),
  public._identity_guard_direct_session(),public.get_my_action_receipt(uuid,uuid),
  public.generate_partner_link_code(uuid,text,uuid,uuid),public.accept_partner_link_code(uuid,text,text,uuid,uuid),
  public.unlink_my_partner(uuid,uuid),public.set_relationship_permissions(jsonb,uuid,uuid),public.set_my_profile_role(text),
  public.execute_reward_command(uuid,uuid,text,uuid,uuid,text,integer,uuid),public.execute_task_command(uuid,uuid,text,uuid,uuid,uuid),
  public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid,uuid),public.undo_action(uuid,uuid,uuid,uuid),
  public.acknowledge_action_feedback(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_identity(),public._identity_require_session(uuid,uuid),public.get_my_action_receipt(uuid,uuid),
  public.generate_partner_link_code(uuid,text,uuid,uuid),public.accept_partner_link_code(uuid,text,text,uuid,uuid),
  public.unlink_my_partner(uuid,uuid),public.set_relationship_permissions(jsonb,uuid,uuid),public.set_my_profile_role(text),
  public.execute_reward_command(uuid,uuid,text,uuid,uuid,text,integer,uuid),public.execute_task_command(uuid,uuid,text,uuid,uuid,uuid),
  public.execute_recording_command(uuid,uuid,text,uuid,uuid,uuid,uuid),public.undo_action(uuid,uuid,uuid,uuid),
  public.acknowledge_action_feedback(uuid,uuid,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
