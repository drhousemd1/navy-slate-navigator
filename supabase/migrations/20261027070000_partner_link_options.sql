-- Read-only invitation metadata. Does not enable lifecycle/accounting or expose
-- a former partner's profile, identifiers, current relationship or availability.
begin;

create function public.get_my_partner_link_options(
  p_expected_relationship_id uuid, p_expected_relationship_session_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid(); v_identity jsonb; v_ready boolean;
  v_archived jsonb; v_invitation jsonb;
begin
  -- Same lock as generation/acceptance: the options and retained invitation
  -- describe one verified current connection, not a mix of lifecycle states.
  perform public._identity_require_session(p_expected_relationship_id,p_expected_relationship_session_id);
  v_identity := public.get_my_identity();
  if v_identity->>'status' is distinct from 'ready_solo' then
    raise exception using errcode='22023',message='UNLINK_BEFORE_LINKING';
  end if;
  v_ready := coalesce((v_identity->>'lifecycle_ready')::boolean,false)
    and exists(select 1 from public.action_accounting_periods a
      where a.relationship_id=p_expected_relationship_id and a.accounting_enabled and a.activation_id is not null)
    and not exists(select 1 from public.relationship_period_members m
      left join public.action_wallets w on w.relationship_id=m.relationship_id
        and w.participant_id=m.participant_id and w.currency=m.role
      where m.relationship_id=p_expected_relationship_id and w.participant_id is null);

  select coalesce(jsonb_agg(jsonb_build_object(
    'relationship_id',r.id,'started_at',r.started_at,'ended_at',r.ended_at,
    'former_partner_label',case when exists(select 1 from public.relationship_period_members x
      where x.relationship_id=r.id and x.user_id is null) then 'Deleted account' else 'Former partner' end,
    'can_generate_continue',v_ready and own.role=v_identity->>'role'
      and (select count(*) from public.relationship_period_members x
        where x.relationship_id=r.id and x.user_id is not null)=2
      and (select count(distinct x.role) from public.relationship_period_members x where x.relationship_id=r.id)=2
      and exists(select 1 from public.action_accounting_periods a
        where a.relationship_id=r.id and a.accounting_enabled and a.activation_id is not null)
      and not exists(select 1 from public.relationship_period_members m
        left join public.action_wallets w on w.relationship_id=m.relationship_id
          and w.participant_id=m.participant_id and w.currency=m.role
        where m.relationship_id=r.id and w.participant_id is null)
  ) order by r.ended_at desc nulls last,r.started_at desc,r.id),'[]'::jsonb)
  into v_archived
  from public.relationship_periods r
    join public.relationship_period_members own on own.relationship_id=r.id and own.user_id=v_actor
  where r.status='archived'
    and (select count(*) from public.relationship_period_members x where x.relationship_id=r.id)=2;

  -- Do not label an old code as Fresh or revive a pre-generation invitation.
  -- Continue metadata is returned only alongside its own retained period summary.
  select jsonb_build_object('code',i.code,'mode',i.mode,'previous_relationship_id',i.previous_relationship_id)
    into v_invitation from public.partner_link_invitations i
  where i.user_id=v_actor and i.relationship_session_id=p_expected_relationship_session_id
    and (i.mode='fresh' or exists(select 1 from jsonb_array_elements(v_archived) item
      where item->>'relationship_id'=i.previous_relationship_id::text));
  return jsonb_build_object('relationship_id',p_expected_relationship_id,
    'relationship_session_id',p_expected_relationship_session_id,'can_generate_fresh',v_ready,
    'invitation',v_invitation,'archived_relationships',v_archived);
end $$;
revoke all on function public.get_my_partner_link_options(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_partner_link_options(uuid,uuid) to authenticated;
comment on function public.get_my_partner_link_options(uuid,uuid) is
  'Owned masked invitation choices. Eligibility is not evidence of former partner current status; acceptance rechecks both accounts and exact consent.';
notify pgrst,'reload schema';
commit;
