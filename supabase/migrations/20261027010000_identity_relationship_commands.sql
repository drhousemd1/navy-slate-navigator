-- Staged identity/relationship foundation. Apply only after review.
-- Existing accounts retain their original data, pointers and balances. Their
-- lifecycle_ready flag remains FALSE until period-bound atomic action writers,
-- private media and masked archive readers are integrated and verified.
-- This migration is NOT permission to deploy an unfinished unlink/reset flow.
begin;

create table public.relationship_periods (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'archived')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  permissions jsonb not null default '{"task_complete":"both","task_undo":"both","rule_violation":"both","rule_violation_undo":"both","punishment_apply":"both","punishment_undo":"both","sub_reward_redeem":"both","sub_reward_redeem_undo":"both","definition_manage":"both"}'::jsonb
);
create table public.relationship_period_members (
  participant_id uuid primary key default pg_catalog.gen_random_uuid(),
  relationship_id uuid not null references public.relationship_periods(id),
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('dom', 'sub')),
  points_snapshot integer not null default 0,
  dom_points_snapshot integer not null default 0,
  unique (relationship_id, user_id)
);
create index relationship_members_account on public.relationship_period_members(user_id, relationship_id);
create table public.identity_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  relationship_id uuid not null references public.relationship_periods(id),
  -- Operator-owned activation gate; never a user preference or RPC argument.
  lifecycle_ready boolean not null default false
);
create table public.partner_link_invitations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[A-F0-9]{32}$'),
  mode text not null check (mode in ('fresh', 'continue')),
  previous_relationship_id uuid references public.relationship_periods(id),
  created_at timestamptz not null default now(),
  check ((mode = 'fresh' and previous_relationship_id is null) or
         (mode = 'continue' and previous_relationship_id is not null))
);
alter table public.profiles add column timezone text;

alter table public.relationship_periods enable row level security;
alter table public.relationship_period_members enable row level security;
alter table public.identity_contexts enable row level security;
alter table public.partner_link_invitations enable row level security;
revoke all on public.relationship_periods, public.relationship_period_members,
  public.identity_contexts, public.partner_link_invitations from public, anon, authenticated;
grant select, insert, update, delete on public.relationship_periods,
  public.relationship_period_members, public.identity_contexts,
  public.partner_link_invitations to service_role;

-- A short transaction lock serializes rare lifecycle changes, including repair
-- of legacy malformed pointers. Ordinary points/entity writes do not take it.
create function public._identity_lock() returns void
language sql volatile security definer set search_path = '' as $$
  select pg_catalog.pg_advisory_xact_lock(1768187241, 1919249505);
$$;

create function public._identity_make_solo(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_period uuid; v_profile public.profiles%rowtype;
begin
  select * into strict v_profile from public.profiles where id = p_user;
  insert into public.relationship_periods default values returning id into v_period;
  insert into public.relationship_period_members
    (relationship_id, user_id, role, points_snapshot, dom_points_snapshot)
  values (v_period, p_user, v_profile.role, v_profile.points, coalesce(v_profile.dom_points, 0));
  insert into public.identity_contexts(user_id, relationship_id)
  values (p_user, v_period)
  on conflict (user_id) do update set relationship_id = excluded.relationship_id;
  return v_period;
end;
$$;

-- Preserve existing valid pairs as a single period. Malformed pointers are not
-- repaired by migration; get_my_identity reports them and domain access fails closed.
do $$
declare p record; v_partner public.profiles%rowtype; v_period uuid;
begin
  for p in select * from public.profiles order by id loop
    if exists (select 1 from public.identity_contexts where user_id = p.id) then continue; end if;
    select * into v_partner from public.profiles where id = p.linked_partner_id;
    if v_partner.id is not null and v_partner.id <> p.id and
       v_partner.linked_partner_id = p.id and v_partner.role <> p.role and
       not exists (select 1 from public.identity_contexts where user_id = v_partner.id) then
      insert into public.relationship_periods default values returning id into v_period;
      insert into public.relationship_period_members
        (relationship_id, user_id, role, points_snapshot, dom_points_snapshot)
      values (v_period, p.id, p.role, p.points, coalesce(p.dom_points, 0)),
             (v_period, v_partner.id, v_partner.role, v_partner.points, coalesce(v_partner.dom_points, 0));
      insert into public.identity_contexts(user_id, relationship_id)
      values (p.id, v_period), (v_partner.id, v_period);
    else
      perform public._identity_make_solo(p.id);
    end if;
  end loop;
end;
$$;

create function public._identity_peer(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select peer.id from public.profiles me
  join public.profiles peer on peer.id = me.linked_partner_id
  join public.identity_contexts mc on mc.user_id = me.id
  join public.identity_contexts pc on pc.user_id = peer.id and pc.relationship_id = mc.relationship_id
  join public.relationship_periods r on r.id = mc.relationship_id and r.status = 'active'
  where me.id = p_user and peer.id <> me.id and peer.linked_partner_id = me.id
    and me.role in ('dom','sub') and peer.role in ('dom','sub') and me.role <> peer.role
    and (select count(*) from public.relationship_period_members m where m.relationship_id = r.id) = 2
    and exists (select 1 from public.relationship_period_members m where m.relationship_id = r.id and m.user_id = me.id and m.role = me.role)
    and exists (select 1 from public.relationship_period_members m where m.relationship_id = r.id and m.user_id = peer.id and m.role = peer.role)
    and not exists (select 1 from public.profiles x where x.id not in (me.id,peer.id) and x.linked_partner_id in (me.id,peer.id));
$$;

create function public.current_relationship_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.relationship_id from public.identity_contexts c
  join public.profiles p on p.id = c.user_id
  join public.relationship_periods r on r.id = c.relationship_id and r.status = 'active'
  where c.user_id = (select auth.uid()) and p.role in ('dom','sub')
    and exists (select 1 from public.relationship_period_members m where m.relationship_id = r.id and m.user_id = p.id and m.role = p.role)
    and (public._identity_peer(p.id) is not null or
      (p.linked_partner_id is null
       and (select count(*) from public.relationship_period_members m where m.relationship_id = r.id) = 1
       and not exists (select 1 from public.profiles x where x.linked_partner_id = p.id)));
$$;

create or replace function public.get_linked_partner_id(user_id_param uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  -- Reverse lookup is required by existing task RLS. Never enumerate outsiders.
  select case when user_id_param = (select auth.uid()) then public._identity_peer((select auth.uid()))
              when user_id_param = public._identity_peer((select auth.uid())) then (select auth.uid()) end;
$$;

create function public.get_my_identity() returns jsonb
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
    'permissions',coalesce(r.permissions,'{}'::jsonb),'lifecycle_ready',coalesce(c.lifecycle_ready,false),
    'timezone',p.timezone,'partner_link_code',v_code);
end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  v_role := case lower(btrim(NEW.raw_user_meta_data->>'role'))
    when 'dom' then 'dom' when 'dominant' then 'dom'
    when 'sub' then 'sub' when 'submissive' then 'sub' end;
  -- Missing/invalid role is an authenticated setup state, not guessed authority.
  if v_role is not null then
    insert into public.profiles(id,role,points,dom_points) values (NEW.id,v_role,0,0);
    perform public._identity_make_solo(NEW.id);
  end if;
  return NEW;
end;
$$;

create function public.set_my_profile_role(p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_role text; v_current public.profiles%rowtype;
begin
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  v_role := case lower(btrim(p_role)) when 'dom' then 'dom' when 'dominant' then 'dom'
    when 'sub' then 'sub' when 'submissive' then 'sub' end;
  if v_role is null then raise exception using errcode='22023', message='INVALID_PROFILE_ROLE'; end if;
  perform public._identity_lock();
  select * into v_current from public.profiles where id = v_actor for update;
  if v_current.id is null then
    insert into public.profiles(id,role,points,dom_points) values(v_actor,v_role,0,0);
    perform public._identity_make_solo(v_actor);
  elsif v_current.role is distinct from v_role then
    if v_current.linked_partner_id is not null or exists(select 1 from public.profiles where linked_partner_id = v_actor) then
      raise exception using errcode='22023', message='UNLINK_BEFORE_ROLE_CHANGE';
    end if;
    update public.profiles set role = v_role where id = v_actor;
    update public.relationship_period_members set role = v_role
      where user_id = v_actor and relationship_id = (select relationship_id from public.identity_contexts where user_id = v_actor);
    delete from public.partner_link_invitations where user_id = v_actor;
  end if;
  return public.get_my_identity();
end;
$$;

create function public.set_my_timezone(p_timezone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using errcode='22023', message='INVALID_TIMEZONE';
  end if;
  update public.profiles set timezone = p_timezone where id = auth.uid();
  if not found then raise exception using errcode='22023', message='PROFILE_SETUP_REQUIRED'; end if;
  return public.get_my_identity();
end;
$$;

create function public._identity_require_lifecycle(p_user uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.identity_contexts where user_id = p_user and lifecycle_ready) then
    raise exception using errcode='55000', message='LIFECYCLE_INTEGRATION_REQUIRED';
  end if;
end;
$$;

-- Remove the former overload: omitting the reviewed period must not bypass the guard.
drop function if exists public.generate_partner_link_code(text,uuid);
create function public.generate_partner_link_code(p_expected_relationship_id uuid, p_mode text default 'fresh', p_previous_relationship_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_code text;
begin
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  perform public._identity_lock();
  if p_expected_relationship_id is null or p_expected_relationship_id is distinct from
     (select relationship_id from public.identity_contexts where user_id=v_actor) then
    raise exception using errcode='22023',message='PERIOD_CHANGED';
  end if;
  perform public._identity_require_lifecycle(v_actor);
  if public.get_my_identity()->>'status' <> 'ready_solo' then
    raise exception using errcode='22023', message='UNLINK_BEFORE_LINKING';
  end if;
  if p_mode is null or p_mode not in ('fresh','continue') or
     (p_mode = 'fresh' and p_previous_relationship_id is not null) then
    raise exception using errcode='22023', message='INVALID_LINK_MODE';
  end if;
  if p_mode = 'continue' and not exists (
    select 1 from public.relationship_periods r
    join public.relationship_period_members m on m.relationship_id = r.id
    where r.id = p_previous_relationship_id and r.status = 'archived' and m.user_id = v_actor
      and (select count(*) from public.relationship_period_members x where x.relationship_id = r.id and x.user_id is not null) = 2
  ) then raise exception using errcode='22023', message='INVALID_PREVIOUS_RELATIONSHIP'; end if;
  v_code := upper(replace(pg_catalog.gen_random_uuid()::text,'-',''));
  insert into public.partner_link_invitations(user_id,code,mode,previous_relationship_id)
  values(v_actor,v_code,p_mode,p_previous_relationship_id)
  on conflict(user_id) do update set code=excluded.code,mode=excluded.mode,
    previous_relationship_id=excluded.previous_relationship_id,created_at=now();
  return jsonb_build_object('code',v_code,'expires_at',null,'mode',p_mode,'previous_relationship_id',p_previous_relationship_id);
end;
$$;

create function public.preview_partner_link_code(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); inv public.partner_link_invitations%rowtype;
begin
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  select * into inv from public.partner_link_invitations where code = upper(btrim(p_code));
  if inv.user_id is null or inv.user_id = v_actor or
     (inv.mode = 'continue' and not exists(select 1 from public.relationship_period_members
       where relationship_id = inv.previous_relationship_id and user_id = v_actor)) then
    raise exception using errcode='22023', message='INVALID_LINK_CODE';
  end if;
  return jsonb_build_object('mode',inv.mode,'previous_relationship_id',inv.previous_relationship_id,
    'can_continue_previous',exists(select 1 from public.relationship_periods r
      join public.relationship_period_members a on a.relationship_id=r.id and a.user_id=v_actor
      join public.relationship_period_members b on b.relationship_id=r.id and b.user_id=inv.user_id
      where r.status='archived'));
end;
$$;

create function public._identity_archive(p_period uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.relationship_period_members m set points_snapshot=p.points,
    dom_points_snapshot=coalesce(p.dom_points,0)
  from public.profiles p where m.relationship_id=p_period and m.user_id=p.id;
  update public.relationship_periods set status='archived',ended_at=now() where id=p_period;
end;
$$;

drop function if exists public.accept_partner_link_code(text,text,uuid);
create function public.accept_partner_link_code(p_expected_relationship_id uuid, p_code text, p_mode text, p_previous_relationship_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); inv public.partner_link_invitations%rowtype;
  a public.profiles%rowtype; b public.profiles%rowtype; v_period uuid; old_period uuid;
begin
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  perform public._identity_lock();
  if p_expected_relationship_id is null or p_expected_relationship_id is distinct from
     (select relationship_id from public.identity_contexts where user_id=v_actor) then
    raise exception using errcode='22023',message='PERIOD_CHANGED';
  end if;
  perform public.preview_partner_link_code(p_code);
  select * into strict inv from public.partner_link_invitations where code=upper(btrim(p_code));
  perform public._identity_require_lifecycle(v_actor);
  perform public._identity_require_lifecycle(inv.user_id);
  perform id from public.profiles where id in(v_actor,inv.user_id) order by id for update;
  select * into a from public.profiles where id=v_actor;
  select * into b from public.profiles where id=inv.user_id;
  if a.id is null or b.id is null or a.role not in('dom','sub') or b.role not in('dom','sub') then
    raise exception using errcode='22023', message='PROFILE_SETUP_REQUIRED';
  end if;
  if a.role=b.role then raise exception using errcode='22023', message='SAME_ROLE'; end if;
  if a.linked_partner_id is not null or b.linked_partner_id is not null or
     exists(select 1 from public.profiles where linked_partner_id in(a.id,b.id)) then
    raise exception using errcode='22023', message='ALREADY_LINKED_OR_INCOMPLETE';
  end if;
  if p_mode is distinct from inv.mode or p_previous_relationship_id is distinct from inv.previous_relationship_id then
    raise exception using errcode='22023', message='CONSENT_MISMATCH';
  end if;
  -- Both accounts have explicitly chosen the same mode. Archive their solo
  -- contexts without moving old rows into the new relationship.
  for old_period in select distinct relationship_id from public.identity_contexts where user_id in(a.id,b.id) loop
    perform public._identity_archive(old_period);
  end loop;
  if inv.mode='continue' then
    v_period:=inv.previous_relationship_id;
    if not exists(select 1 from public.relationship_periods where id=v_period and status='archived') or
       not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=a.id and role=a.role) or
       not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=b.id and role=b.role) then
      raise exception using errcode='22023', message='PREVIOUS_RELATIONSHIP_CHANGED';
    end if;
    update public.relationship_periods set status='active',ended_at=null where id=v_period;
    update public.profiles p set points=m.points_snapshot,dom_points=m.dom_points_snapshot
      from public.relationship_period_members m where m.relationship_id=v_period and m.user_id=p.id;
  else
    insert into public.relationship_periods default values returning id into v_period;
    insert into public.relationship_period_members(relationship_id,user_id,role)
      values(v_period,a.id,a.role),(v_period,b.id,b.role);
    update public.profiles set points=0,dom_points=0 where id in(a.id,b.id);
  end if;
  update public.identity_contexts set relationship_id=v_period where user_id in(a.id,b.id);
  update public.profiles set linked_partner_id=case when id=a.id then b.id else a.id end where id in(a.id,b.id);
  delete from public.partner_link_invitations where user_id in(a.id,b.id);
  return public.get_my_identity();
end;
$$;

create function public.unlink_my_partner(p_expected_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_peer uuid; v_period uuid; affected record;
begin
  if v_actor is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  perform public._identity_lock();
  perform public._identity_require_lifecycle(v_actor);
  if p_expected_relationship_id is distinct from (select relationship_id from public.identity_contexts where user_id=v_actor) then
    raise exception using errcode='22023',message='PERIOD_CHANGED';
  end if;
  -- Lock only profiles actually involved. An unrelated valid pair referenced
  -- by a malformed outgoing pointer must not be unlinked or archived.
  perform id from public.profiles where id=v_actor or linked_partner_id=v_actor order by id for update;
  select relationship_id into v_period from public.identity_contexts where user_id=v_actor;
  if not exists(select 1 from public.profiles where (id=v_actor and linked_partner_id is not null) or linked_partner_id=v_actor)
     and (select count(*) from public.relationship_period_members where relationship_id=v_period)=1 then
    return public.get_my_identity(); -- Already solo: do not turn Unlink into an implicit reset.
  end if;
  select user_id into v_peer from public.relationship_period_members
    where relationship_id=v_period and user_id<>v_actor;
  if v_peer is not null and exists(select 1 from public.identity_contexts where user_id=v_peer and relationship_id=v_period) then
    perform public._identity_require_lifecycle(v_peer);
  else v_peer:=null; end if;
  perform public._identity_archive(v_period);
  for affected in select id from public.profiles where id=v_actor or linked_partner_id=v_actor loop
    update public.profiles set linked_partner_id=null where id=affected.id;
    delete from public.partner_link_invitations where user_id=affected.id;
  end loop;
  perform public._identity_make_solo(v_actor);
  if v_peer is not null then
    update public.profiles set linked_partner_id=null where id=v_peer and linked_partner_id=v_actor;
    perform public._identity_make_solo(v_peer);
    delete from public.partner_link_invitations where user_id=v_peer;
  end if;
  return public.get_my_identity();
end;
$$;

create function public.set_relationship_permissions(p_permissions jsonb,p_expected_relationship_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_period uuid; v_key text; v_value jsonb; v_allowed jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  perform public._identity_lock();
  v_period:=public.current_relationship_id();
  if p_expected_relationship_id is distinct from v_period then
    raise exception using errcode='22023',message='PERIOD_CHANGED';
  end if;
  if public._identity_peer(auth.uid()) is null or not exists(select 1 from public.profiles where id=auth.uid() and role='dom') then
    raise exception using errcode='42501', message='LINKED_DOM_REQUIRED';
  end if;
  if p_permissions is null or jsonb_typeof(p_permissions)<>'object' then
    raise exception using errcode='22023', message='INVALID_PERMISSIONS';
  end if;
  select permissions into v_allowed from public.relationship_periods where id=v_period;
  for v_key,v_value in select * from jsonb_each(p_permissions) loop
    if not(v_allowed ? v_key) or v_value not in('"dom"'::jsonb,'"sub"'::jsonb,'"both"'::jsonb) then
      raise exception using errcode='22023', message='INVALID_PERMISSION_CHOICE';
    end if;
  end loop;
  update public.relationship_periods set permissions=permissions || p_permissions where id=v_period;
  return public.get_my_identity();
end;
$$;

create function public.list_my_relationship_periods() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('relationship_id',r.id,'status',r.status,
    'started_at',r.started_at,'ended_at',r.ended_at,'is_current',c.relationship_id=r.id,
    'participant_count',(select count(*) from public.relationship_period_members x where x.relationship_id=r.id),
    'former_partner_label',case when exists(select 1 from public.relationship_period_members x
      where x.relationship_id=r.id and x.user_id is null) then 'Deleted account' else 'Former partner' end)
    order by r.started_at desc),'[]'::jsonb)
  from public.relationship_periods r
  join public.relationship_period_members m on m.relationship_id=r.id and m.user_id=(select auth.uid())
  join public.identity_contexts c on c.user_id=m.user_id;
$$;

-- Supersede all profile policies; permissive old policies must not OR around
-- the protected identity fields. Both balances remain client-writable within
-- the current valid pair until atomic accounting commands replace those paths.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy %I on public.profiles',p.policyname);
  end loop;
end; $$;
revoke all on public.profiles from public,anon,authenticated;
grant select on public.profiles to authenticated;
grant update(points,dom_points,updated_at,nickname,avatar_url,push_token) on public.profiles to authenticated;
create policy profiles_current_pair_read on public.profiles for select to authenticated
  using(id=(select auth.uid()) or id=public.get_linked_partner_id((select auth.uid())));
create policy profiles_current_pair_update on public.profiles for update to authenticated
  using(id=(select auth.uid()) or id=public.get_linked_partner_id((select auth.uid())))
  with check(id=(select auth.uid()) or id=public.get_linked_partner_id((select auth.uid())));

create function public._identity_profile_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if NEW.id is distinct from OLD.id or NEW.role is distinct from OLD.role or
       NEW.linked_partner_id is distinct from OLD.linked_partner_id or
       NEW.partner_link_code is distinct from OLD.partner_link_code or
       NEW.timezone is distinct from OLD.timezone or NEW.created_at is distinct from OLD.created_at then
      raise exception using errcode='42501', message='IDENTITY_COMMAND_REQUIRED';
    end if;
    if OLD.id is distinct from auth.uid() and
       (NEW.nickname is distinct from OLD.nickname or NEW.avatar_url is distinct from OLD.avatar_url or
        NEW.push_token is distinct from OLD.push_token) then
      raise exception using errcode='42501', message='OWN_PROFILE_FIELDS_ONLY';
    end if;
  end if;
  return NEW;
end;
$$;
create trigger identity_profile_guard before update on public.profiles
  for each row execute function public._identity_profile_guard();

-- Preserve trusted membership rows; role assignment is operator/service-only.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='user_roles' loop
    execute format('drop policy %I on public.user_roles',p.policyname);
  end loop;
end; $$;
revoke all on public.user_roles from public,anon,authenticated;
grant select on public.user_roles to authenticated;
create or replace function public.has_role(requested_user_id uuid, requested_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.uid()) is not null and
    (requested_user_id=(select auth.uid()) or requested_user_id=public._identity_peer((select auth.uid()))
     or exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'))
    and exists(select 1 from public.user_roles where user_id=requested_user_id and role=requested_role),false);
$$;
create policy trusted_roles_read on public.user_roles for select to authenticated
  using(user_id=(select auth.uid()) or user_id=public.get_linked_partner_id((select auth.uid()))
        or public.has_role((select auth.uid()),'admin'::public.app_role));

-- Scope legacy entities/events to their actual relationship period. Nullable
-- unmapped legacy rows are preserved but quarantined, never assigned by guessing.
-- This is metadata backfill, not a wellbeing edit; preserve its original time.
alter table public.wellbeing_snapshots disable trigger update_wellbeing_snapshots_updated_at;
do $$ declare t text; begin
  foreach t in array array['rules','tasks','rewards','punishments','rule_violations',
    'task_completion_history','reward_usage','punishment_history','wellbeing_snapshots'] loop
    execute format('alter table public.%I add column relationship_id uuid references public.relationship_periods(id)',t);
    execute format('update public.%I d set relationship_id=c.relationship_id from public.identity_contexts c where c.user_id=d.user_id',t);
    execute format('create index %I on public.%I(relationship_id)',t || '_relationship_scope',t);
  end loop;
  foreach t in array array['messages','archived_messages'] loop
    execute format('alter table public.%I add column relationship_id uuid references public.relationship_periods(id)',t);
    execute format('update public.%I d set relationship_id=a.relationship_id from public.identity_contexts a,public.identity_contexts b where a.user_id=d.sender_id and b.user_id=d.receiver_id and a.relationship_id=b.relationship_id',t);
    execute format('create index %I on public.%I(relationship_id)',t || '_relationship_scope',t);
  end loop;
end; $$;
alter table public.wellbeing_snapshots enable trigger update_wellbeing_snapshots_updated_at;

create function public._identity_stamp_period() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_period uuid; v_owner uuid; v_definition_period uuid; j jsonb:=to_jsonb(NEW);
begin
  -- Service/operator operations can restore fixtures or perform reviewed backfills.
  -- request role is derived from the verified JWT, not user_metadata.
  if coalesce(auth.role(),'') not in ('authenticated','anon') then return NEW; end if;
  v_period:=public.current_relationship_id();
  if v_period is null then raise exception using errcode='42501',message='VALID_IDENTITY_REQUIRED'; end if;
  if TG_OP='UPDATE' and NEW.relationship_id is distinct from OLD.relationship_id then
    raise exception using errcode='42501',message='PERIOD_IMMUTABLE';
  end if;
  if NEW.relationship_id is not null and NEW.relationship_id<>v_period then
    raise exception using errcode='42501',message='PERIOD_MISMATCH';
  end if;
  NEW.relationship_id:=v_period;
  if TG_TABLE_NAME in('messages','archived_messages') then
    if not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=(j->>'sender_id')::uuid) or
       not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=(j->>'receiver_id')::uuid) then
      raise exception using errcode='42501',message='MESSAGE_PAIR_REQUIRED';
    end if;
    if TG_OP='INSERT' and (j->>'sender_id')::uuid<>auth.uid() then
      raise exception using errcode='42501',message='MESSAGE_SENDER_MISMATCH';
    end if;
    if TG_OP='UPDATE' and (to_jsonb(NEW)-'read_at') is distinct from (to_jsonb(OLD)-'read_at') then
      raise exception using errcode='42501',message='MESSAGE_CONTENT_IMMUTABLE';
    end if;
  else
    v_owner:=(j->>'user_id')::uuid;
    if not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=v_owner) then
      raise exception using errcode='42501',message='OWNER_OUTSIDE_PERIOD';
    end if;
    if TG_TABLE_NAME='task_completion_history' then select relationship_id into v_definition_period from public.tasks where id=(j->>'task_id')::uuid;
    elsif TG_TABLE_NAME='rule_violations' and j->>'rule_id' is not null then select relationship_id into v_definition_period from public.rules where id=(j->>'rule_id')::uuid;
    elsif TG_TABLE_NAME='reward_usage' and j->>'reward_id' is not null then select relationship_id into v_definition_period from public.rewards where id=(j->>'reward_id')::uuid;
    elsif TG_TABLE_NAME='punishment_history' and j->>'punishment_id' is not null then select relationship_id into v_definition_period from public.punishments where id=(j->>'punishment_id')::uuid;
    else v_definition_period:=v_period; end if;
    if v_definition_period is distinct from v_period then
      raise exception using errcode='42501',message='DEFINITION_OUTSIDE_PERIOD';
    end if;
  end if;
  return NEW;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['rules','tasks','rewards','punishments','rule_violations',
    'task_completion_history','reward_usage','punishment_history','wellbeing_snapshots',
    'messages','archived_messages'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy relationship_period_fence on public.%I as restrictive for all to public using (relationship_id=public.current_relationship_id()) with check (relationship_id=public.current_relationship_id())',t);
    execute format('create trigger identity_stamp_period before insert or update on public.%I for each row execute function public._identity_stamp_period()',t);
  end loop;
end; $$;

-- Definer RPCs can bypass table RLS: close the two known legacy task routines
-- over the same session/period boundary instead of leaving an alternate path.
create or replace function public.record_task_completion(task_id_param uuid,user_id_param uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_period uuid:=public.current_relationship_id();
begin
  if v_period is null or not exists(select 1 from public.relationship_period_members where relationship_id=v_period and user_id=user_id_param)
     or not exists(select 1 from public.tasks where id=task_id_param and relationship_id=v_period) then
    raise exception using errcode='42501',message='TASK_OUTSIDE_PERIOD';
  end if;
  insert into public.task_completion_history(task_id,user_id,relationship_id) values(task_id_param,user_id_param,v_period);
end;
$$;

create or replace function public.get_task_completions_for_week(week_start timestamptz)
returns table(completion_date date,completion_count bigint)
language sql stable security definer set search_path = '' as $$
  select date(h.completed_at),count(*) from public.task_completion_history h
  where h.relationship_id=public.current_relationship_id()
    and h.completed_at>=week_start and h.completed_at<week_start+interval '7 days'
  group by date(h.completed_at) order by date(h.completed_at);
$$;

-- Deliberately no storage migration, archive-content endpoint, account deletion,
-- action permission enforcement or atomic balance-command replacement here.
-- lifecycle_ready MUST remain false for existing accounts until those dependencies pass.

-- Lock down every newly introduced callable, including default PUBLIC grants.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like '\_identity\_%' escape '\' or p.proname in
      ('get_my_identity','set_my_profile_role','set_my_timezone','generate_partner_link_code',
       'preview_partner_link_code','accept_partner_link_code','unlink_my_partner',
       'set_relationship_permissions','list_my_relationship_periods','current_relationship_id',
       'get_linked_partner_id','has_role','handle_new_user','record_task_completion','get_task_completions_for_week')) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end; $$;
grant execute on function public.get_my_identity(),public.set_my_profile_role(text),public.set_my_timezone(text),
  public.generate_partner_link_code(uuid,text,uuid),public.preview_partner_link_code(text),
  public.accept_partner_link_code(uuid,text,text,uuid),public.unlink_my_partner(uuid),
  public.set_relationship_permissions(jsonb,uuid),public.list_my_relationship_periods(),
  public.get_linked_partner_id(uuid),public.has_role(uuid,public.app_role),
  public.record_task_completion(uuid,uuid),public.get_task_completions_for_week(timestamptz) to authenticated;
grant execute on function public.current_relationship_id() to anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
