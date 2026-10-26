-- Recipient-owned delivery acknowledgment; immutable business outbox stays intact.
begin;
create table public.action_feedback_acknowledgments (
  event_id uuid not null,
  recipient_participant_id uuid not null,
  kind text not null,
  relationship_id uuid not null references public.relationship_periods(id),
  acknowledged_at timestamptz not null default clock_timestamp(),
  primary key(event_id,recipient_participant_id,kind),
  foreign key(event_id,recipient_participant_id,kind)
    references public.action_feedback_outbox(event_id,recipient_participant_id,kind)
);
alter table public.action_feedback_acknowledgments enable row level security;
revoke all on public.action_feedback_acknowledgments from public,anon,authenticated;
grant select on public.action_feedback_acknowledgments to authenticated;
grant select,insert,update,delete on public.action_feedback_acknowledgments to service_role;
create policy own_feedback_acknowledgments on public.action_feedback_acknowledgments for select to authenticated
using(relationship_id=(select public.current_relationship_id()) and
  recipient_participant_id=((select public.get_my_identity())->>'participant_id')::uuid);
create function public.acknowledge_action_feedback(p_expected_relationship_id uuid,p_event_id uuid,p_kind text)
returns void language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_participant uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._identity_lock();
  v_period:=public.current_relationship_id();
  if v_period is null or p_expected_relationship_id is distinct from v_period then
    raise exception using errcode='42501',message='STALE_RELATIONSHIP';
  end if;
  select participant_id into strict v_participant from public.relationship_period_members
    where user_id=auth.uid() and relationship_id=v_period;
  if not exists(select 1 from public.action_feedback_outbox where event_id=p_event_id
    and recipient_participant_id=v_participant and relationship_id=v_period and kind=p_kind) then
    raise exception using errcode='42501',message='OWN_FEEDBACK_REQUIRED';
  end if;
  insert into public.action_feedback_acknowledgments(event_id,recipient_participant_id,kind,relationship_id)
    values(p_event_id,v_participant,p_kind,v_period) on conflict do nothing;
end $$;
revoke all on function public.acknowledge_action_feedback(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.acknowledge_action_feedback(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
