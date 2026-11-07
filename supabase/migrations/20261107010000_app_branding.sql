-- Shared public artwork; only a separately appointed branding owner may publish.
-- This migration grants no membership and changes no existing image bucket.
begin;
create table public.app_branding_owner (
  singleton boolean primary key default true check(singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
create table public.app_logo_versions (
  id uuid primary key,
  object_path text unique,
  mime_type text,
  byte_size integer,
  sha256 text,
  created_at timestamptz not null default now(),
  check ((id='00000000-0000-4000-8000-000000000001'::uuid and object_path is null and mime_type is null and byte_size is null and sha256 is null) or
    (object_path is not null and mime_type is not null and byte_size is not null and sha256 is not null and mime_type in('image/png','image/jpeg','image/webp') and byte_size between 1 and 10485760 and
     sha256 ~ '^[0-9a-f]{64}$' and object_path='versions/'||id::text||'/'||sha256||case mime_type when 'image/png' then '.png' when 'image/jpeg' then '.jpg' else '.webp' end))
);
create table public.app_branding_state (
  singleton boolean primary key default true check(singleton),
  version_id uuid not null references public.app_logo_versions(id),
  revision bigint not null check(revision between 0 and 9007199254740991)
);
-- Selection history also serves as immutable command receipts. Keep it when an
-- owner account is deleted; it contains no credentials or personal file names.
create table public.app_logo_selections (
  revision bigint primary key,
  command_id uuid not null unique,
  actor_user_id uuid,
  intent_hash text not null,
  version_id uuid not null references public.app_logo_versions(id),
  selected_at timestamptz not null default now()
);
insert into public.app_logo_versions(id) values('00000000-0000-4000-8000-000000000001');
insert into public.app_branding_state values(true,'00000000-0000-4000-8000-000000000001',0);
do $$ declare t text; begin
  foreach t in array array['app_branding_owner','app_logo_versions','app_branding_state','app_logo_selections'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
end $$;
-- Dedicated immutable public artwork only. Historical private buckets stay private.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('app-branding','app-branding',true,10485760,array['image/png','image/jpeg','image/webp']);
create policy app_branding_service_only on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'app-branding') with check(bucket_id<>'app-branding');

create function public._branding_is_owner(p_actor uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public._deletion_available(p_actor) and exists(select 1 from public.app_branding_owner where user_id=p_actor);
$$;
create function public.get_my_branding_access() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public._branding_is_owner(auth.uid()),false);
$$;
create function public._branding_version(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',id,'objectPath',object_path,'mimeType',mime_type,'byteSize',byte_size,'sha256',sha256,'createdAt',created_at)
  from public.app_logo_versions where id=p_id;
$$;
create function public.get_app_branding() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('revision',revision,'version',public._branding_version(version_id)) from public.app_branding_state where singleton;
$$;
create function public.get_app_branding_history() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not coalesce(public._branding_is_owner(auth.uid()),false) then raise exception using errcode='42501',message='BRANDING_OWNER_REQUIRED'; end if;
  return jsonb_build_object('current',public.get_app_branding(),
    'versions',(select coalesce(jsonb_agg(public._branding_version(id) order by created_at desc,id),'[]'::jsonb) from public.app_logo_versions),
    'selections',(select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'versionId',version_id,'selectedAt',selected_at) order by revision desc),'[]'::jsonb) from public.app_logo_selections));
end $$;
create function public.branding_check_owner(p_actor uuid) returns void language plpgsql security definer set search_path='' as $$ begin
  perform public._deletion_service(); perform public._deletion_require_available(p_actor);
  if not public._branding_is_owner(p_actor) then raise exception using errcode='42501',message='BRANDING_OWNER_REQUIRED'; end if;
end $$;
create function public.branding_get_version(p_actor uuid,p_version_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; begin
  perform public.branding_check_owner(p_actor);
  v:=public._branding_version(p_version_id);
  if v is null then raise exception using errcode='P0002',message='LOGO_NOT_FOUND'; end if;
  return v;
end $$;
create function public.branding_commit(p_actor uuid,p_command_id uuid,p_expected_revision bigint,p_version_id uuid,p_upload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.app_branding_state%rowtype; r public.app_logo_selections%rowtype; intent text; v public.app_logo_versions%rowtype; expected_path text;
begin
  perform public._deletion_service(); perform public._identity_lock(); perform public._deletion_require_available(p_actor);
  -- Revocation and account lifecycle serialize with the short pointer transaction.
  perform 1 from public.app_branding_owner where user_id=p_actor for share;
  if not found then raise exception using errcode='42501',message='BRANDING_OWNER_REQUIRED'; end if;
  if p_command_id is null or p_version_id is null or p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=9007199254740991 then
    raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if p_upload is not null then
    if jsonb_typeof(p_upload) is distinct from 'object' or p_version_id<>p_command_id or p_version_id='00000000-0000-4000-8000-000000000001'::uuid or
      p_upload->>'mimeType' is null or p_upload->>'mimeType' not in('image/png','image/jpeg','image/webp') or
      not coalesce(p_upload->>'sha256' ~ '^[0-9a-f]{64}$',false) or
      not coalesce(p_upload->>'byteSize' ~ '^[1-9][0-9]{0,7}$',false) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    if (p_upload->>'byteSize')::integer>10485760 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    expected_path:='versions/'||p_version_id::text||'/'||(p_upload->>'sha256')||case p_upload->>'mimeType' when 'image/png' then '.png' when 'image/jpeg' then '.jpg' else '.webp' end;
    if p_upload->>'objectPath' is distinct from expected_path or
      p_upload - array['objectPath','mimeType','byteSize','sha256'] <> '{}'::jsonb then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  end if;
  intent:=encode(extensions.digest(jsonb_build_object('expectedRevision',p_expected_revision,'versionId',p_version_id,'upload',p_upload)::text,'sha256'),'hex');
  select * into s from public.app_branding_state where singleton for update;
  select * into r from public.app_logo_selections where command_id=p_command_id;
  if found then
    if r.actor_user_id is distinct from p_actor or r.intent_hash<>intent then raise exception using errcode='23505',message='COMMAND_ID_REUSED'; end if;
    return jsonb_build_object('commandId',p_command_id,'versionId',r.version_id,'revision',r.revision,'replayed',true);
  end if;
  if s.revision<>p_expected_revision then raise exception using errcode='40001',message='LOGO_REVISION_CONFLICT'; end if;
  if p_upload is not null then
    if not exists(select 1 from storage.objects where bucket_id='app-branding' and name=expected_path and
      metadata->>'mimetype'=p_upload->>'mimeType' and metadata->>'size'=p_upload->>'byteSize') then
      raise exception using errcode='22023',message='LOGO_OBJECT_UNVERIFIED'; end if;
    insert into public.app_logo_versions(id,object_path,mime_type,byte_size,sha256)
      values(p_version_id,expected_path,p_upload->>'mimeType',(p_upload->>'byteSize')::integer,p_upload->>'sha256');
  end if;
  select * into v from public.app_logo_versions where id=p_version_id;
  if not found then raise exception using errcode='P0002',message='LOGO_NOT_FOUND'; end if;
  update public.app_branding_state set version_id=p_version_id,revision=s.revision+1 where singleton;
  insert into public.app_logo_selections(revision,command_id,actor_user_id,intent_hash,version_id)
    values(s.revision+1,p_command_id,p_actor,intent,p_version_id);
  return jsonb_build_object('commandId',p_command_id,'versionId',p_version_id,'revision',s.revision+1,'replayed',false);
end $$;

revoke all on function public._branding_is_owner(uuid),public._branding_version(uuid),public.get_my_branding_access(),public.get_app_branding(),public.get_app_branding_history(),public.branding_check_owner(uuid),public.branding_get_version(uuid,uuid),public.branding_commit(uuid,uuid,bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.get_app_branding() to anon,authenticated;
grant execute on function public.get_my_branding_access(),public.get_app_branding_history() to authenticated;
grant execute on function public.branding_check_owner(uuid),public.branding_get_version(uuid,uuid),public.branding_commit(uuid,uuid,bigint,uuid,jsonb) to service_role;
commit;
