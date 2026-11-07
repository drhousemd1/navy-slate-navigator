-- Personal dashboard definitions. No original definition/history/point rewrite.
begin;
create table public.throne_cards (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null check(revision between 1 and 9007199254740991),
  definition jsonb,
  deleted boolean not null default false,
  last_command_id uuid not null,
  last_command_digest text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((deleted and definition is null) or (not deleted and definition is not null and jsonb_typeof(definition)='object'))
);
create index throne_cards_owner on public.throne_cards(user_id,created_at,id) where not deleted;
alter table public.throne_cards enable row level security;
revoke all on public.throne_cards from public,anon,authenticated;
grant select on public.throne_cards to authenticated;
grant select,insert,update,delete on public.throne_cards to service_role;
create policy throne_cards_owner_read on public.throne_cards for select to authenticated
  using(user_id=(select auth.uid()) and (select public._deletion_current_available()));

create function public._throne_validate_image(p_image jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare url text; encoded text; bytes bytea; meta jsonb; k text; dims jsonb;
begin
  if p_image='null'::jsonb then return; end if;
  if p_image is null or jsonb_typeof(p_image) is distinct from 'object' or
    not (p_image ?& array['dataUrl','metadata']) or (select count(*) from jsonb_object_keys(p_image))<>2 then
    raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  url:=p_image->>'dataUrl'; meta:=p_image->'metadata';
  if jsonb_typeof(p_image->'dataUrl') is distinct from 'string' or length(url)>2796234 or
    url !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  encoded:=split_part(url,',',2);
  if length(encoded)%4<>0 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  bytes:=decode(encoded,'base64');
  if octet_length(bytes)<8 or octet_length(bytes)>2097152 or
    (url like 'data:image/png;%' and substring(bytes from 1 for 8)<>decode('89504e470d0a1a0a','hex')) or
    (url like 'data:image/jpeg;%' and substring(bytes from 1 for 3)<>decode('ffd8ff','hex')) then
    raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if jsonb_typeof(meta) is distinct from 'object' or not (meta ?& array['originalSize','compressedSize','compressionRatio','originalDimensions','compressedDimensions','timestamp']) or
    (select count(*) from jsonb_object_keys(meta))<>6 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  foreach k in array array['originalSize','compressedSize','compressionRatio'] loop
    if jsonb_typeof(meta->k) is distinct from 'number' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    if trunc((meta->>k)::numeric)<>(meta->>k)::numeric then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  end loop;
  if (meta->>'originalSize')::numeric not between 1 and 12582912 or (meta->>'compressedSize')::numeric<>octet_length(bytes) or
    jsonb_typeof(meta->'timestamp') is distinct from 'string' or length(meta->>'timestamp')>40 or
    (meta->>'timestamp') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  foreach k in array array['originalDimensions','compressedDimensions'] loop
    dims:=meta->k;
    if jsonb_typeof(dims) is distinct from 'object' or not (dims ?& array['width','height']) or
      (select count(*) from jsonb_object_keys(dims))<>2 or jsonb_typeof(dims->'width') is distinct from 'number' or
      jsonb_typeof(dims->'height') is distinct from 'number' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    if (dims->>'width')::numeric<1 or (dims->>'height')::numeric<1 or
      trunc((dims->>'width')::numeric)<>(dims->>'width')::numeric or trunc((dims->>'height')::numeric)<>(dims->>'height')::numeric or
      (k='compressedDimensions' and ((dims->>'width')::numeric>1920 or (dims->>'height')::numeric>1080)) then
      raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  end loop;
end $$;

create function public._throne_validate_definition(p_definition jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare k text; image jsonb;
begin
  if p_definition is null or jsonb_typeof(p_definition) is distinct from 'object' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if octet_length(p_definition::text)>6291456 then raise exception using errcode='22023',message='CARD_TOO_LARGE'; end if;
  if not (p_definition ?& array['title','description','series','priority','iconName','icon','titleColor','descriptionColor','iconColor','calendarColor','images','opacity','focalX','focalY','highlight']) or
    (select count(*) from jsonb_object_keys(p_definition))<>15 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if jsonb_typeof(p_definition->'title') is distinct from 'string' or length(p_definition->>'title') not between 1 and 200 or btrim(p_definition->>'title')='' or
    jsonb_typeof(p_definition->'description') is distinct from 'string' or length(p_definition->>'description')>2000 or
    (p_definition->>'series') not in ('subTasksCompleted','domTasksCompleted','rulesBroken','subRewardsRedeemed','domRewardsRedeemed','punishmentsPerformed') or
    jsonb_typeof(p_definition->'series') is distinct from 'string' or jsonb_typeof(p_definition->'priority') is distinct from 'string' or
    (p_definition->>'priority') not in ('low','medium','high') or jsonb_typeof(p_definition->'highlight') is distinct from 'boolean' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if p_definition->'iconName'<>'null'::jsonb and (jsonb_typeof(p_definition->'iconName') is distinct from 'string' or
    (p_definition->>'iconName') !~ '^[A-Za-z][A-Za-z0-9]{0,63}$') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if p_definition->'iconName'<>'null'::jsonb and p_definition->'icon'<>'null'::jsonb then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  foreach k in array array['titleColor','descriptionColor','iconColor','calendarColor'] loop
    if p_definition->k<>'null'::jsonb and (jsonb_typeof(p_definition->k) is distinct from 'string' or
      (p_definition->>k) !~ '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  end loop;
  foreach k in array array['opacity','focalX','focalY'] loop
    if p_definition->k<>'null'::jsonb then
      if jsonb_typeof(p_definition->k) is distinct from 'number' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
      if (p_definition->>k)::numeric not between 0 and 100 or trunc((p_definition->>k)::numeric)<>(p_definition->>k)::numeric then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    end if;
  end loop;
  if jsonb_typeof(p_definition->'images') is distinct from 'array' or jsonb_array_length(p_definition->'images')<>5 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  perform public._throne_validate_image(p_definition->'icon');
  for image in select value from jsonb_array_elements(p_definition->'images') loop perform public._throne_validate_image(image); end loop;
end $$;

create function public.get_throne_cards() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  if actor is null or auth.role() is distinct from 'authenticated' then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._deletion_require_available(actor);
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'ownerId',user_id,'revision',revision,'definition',definition) order by created_at,id),'[]'::jsonb)
    into result from public.throne_cards where user_id=actor and not deleted;
  return result;
end $$;

create function public.commit_throne_card(p_actor uuid,p_card_id uuid,p_command_id uuid,p_expected_revision bigint,p_kind text,p_definition jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); card public.throne_cards%rowtype; digest text; next_revision bigint; replayed boolean:=false;
begin
  if actor is null or actor is distinct from p_actor or auth.role() is distinct from 'authenticated' then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  -- Same lock as lifecycle fencing. The Auth FK removes only this owner's cards
  -- at final account deletion; relationship/role changes never change ownership.
  perform public._identity_lock(); perform public._deletion_require_available(actor);
  if p_card_id is null or p_command_id is null or p_expected_revision is null or p_expected_revision not between 0 and 9007199254740990 or
    p_kind is null or p_kind not in ('save','delete') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if p_kind='save' then perform public._throne_validate_definition(p_definition);
  elsif p_expected_revision=0 or p_definition is not null then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  digest:=md5(jsonb_build_object('actor',actor,'card',p_card_id,'revision',p_expected_revision,'kind',p_kind,'definition',p_definition)::text);
  select * into card from public.throne_cards where id=p_card_id for update;
  if found then
    if card.user_id<>actor then raise exception using errcode='42501',message='CARD_NOT_FOUND'; end if;
    if card.last_command_id=p_command_id then
      if card.last_command_digest<>digest then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
      replayed:=true; next_revision:=card.revision;
    else
      if card.deleted then raise exception using errcode='22023',message='CARD_NOT_FOUND'; end if;
      if card.revision<>p_expected_revision then raise exception using errcode='40001',message='CARD_REVISION_CONFLICT'; end if;
      next_revision:=card.revision+1;
      update public.throne_cards set definition=p_definition,deleted=(p_kind='delete'),revision=next_revision,last_command_id=p_command_id,last_command_digest=digest,updated_at=now() where id=p_card_id;
    end if;
  else
    if p_expected_revision<>0 or p_kind<>'save' then raise exception using errcode='40001',message='CARD_REVISION_CONFLICT'; end if;
    if (select count(*) from public.throne_cards where user_id=actor and not deleted)>=20 then raise exception using errcode='22023',message='CARD_LIMIT'; end if;
    next_revision:=1;
    insert into public.throne_cards(id,user_id,revision,definition,last_command_id,last_command_digest) values(p_card_id,actor,1,p_definition,p_command_id,digest);
  end if;
  return jsonb_build_object('commandId',p_command_id,'cardId',p_card_id,'revision',next_revision,'deleted',p_kind='delete','replayed',replayed);
end $$;

revoke all on function public._throne_validate_image(jsonb), public._throne_validate_definition(jsonb), public.get_throne_cards(), public.commit_throne_card(uuid,uuid,uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.get_throne_cards(), public.commit_throne_card(uuid,uuid,uuid,bigint,text,jsonb) to authenticated;
comment on table public.throne_cards is 'Private account-owned custom Throne cards. No prototype localStorage import, fabricated usage history, or balance effects. Tombstones prevent stale resurrection; Auth deletion cascades.';
notify pgrst, 'reload schema';
commit;
