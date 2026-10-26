-- Additive timezone initialization. Review before local application.
-- This never changes an existing saved preference, including one written by a
-- simultaneous login or an explicit set_my_timezone request.
begin;

create function public.initialize_my_timezone(p_timezone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode='42501', message='AUTH_REQUIRED';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
     or p_timezone like 'posix/%' or p_timezone like 'right/%' then
    raise exception using errcode='22023', message='INVALID_TIMEZONE';
  end if;
  perform public._identity_lock();
  update public.profiles set timezone = p_timezone
    where id = v_actor and timezone is null;
  if not found and not exists(select 1 from public.profiles where id = v_actor) then
    raise exception using errcode='22023', message='PROFILE_SETUP_REQUIRED';
  end if;
  return public.get_my_identity();
end;
$$;

revoke all on function public.initialize_my_timezone(text) from public, anon;
grant execute on function public.initialize_my_timezone(text) to authenticated;

commit;
