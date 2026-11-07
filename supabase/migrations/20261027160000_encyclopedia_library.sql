-- Global educational library. No original row rewrite or membership grant.
begin;
create table public.encyclopedia_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- No Auth/relationship FK: library content outlives its editor. Deleted IDs keep
-- only their revision tombstone, preventing stale commands from resurrecting IDs.
create table public.encyclopedia_entry_state (
  entry_id uuid primary key,
  revision bigint not null check(revision between 1 and 9007199254740991),
  content_document jsonb,
  deleted boolean not null default false,
  check(not deleted or content_document is null)
);
create table public.encyclopedia_command_receipts (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  command_id uuid not null,
  intent_hash text not null,
  entry_id uuid not null,
  revision bigint not null,
  deleted boolean not null,
  primary key(actor_user_id,command_id)
);
do $$ declare t text; p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='encyclopedia_entries' loop
    execute format('drop policy %I on public.encyclopedia_entries',p.policyname);
  end loop;
  foreach t in array array['encyclopedia_entries','encyclopedia_editors','encyclopedia_entry_state','encyclopedia_command_receipts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;

create function public._encyclopedia_can_edit(p_actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public._deletion_available(p_actor) and
    (exists(select 1 from public.encyclopedia_editors where user_id=p_actor)
     or exists(select 1 from public.user_roles where user_id=p_actor and role='admin'));
$$;
create function public.encyclopedia_check_editor(p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
  perform public._deletion_service(); perform public._deletion_require_available(p_actor);
  if not public._encyclopedia_can_edit(p_actor) then raise exception using errcode='42501',message='EDITOR_REQUIRED'; end if;
end $$;
create function public.get_encyclopedia_library() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); entries jsonb;
begin
  if actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._deletion_require_available(actor);
  select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('revision',coalesce(s.revision,1),'contentDocument',s.content_document)
    order by e.title,e.id),'[]'::jsonb) into entries from public.encyclopedia_entries e
    left join public.encyclopedia_entry_state s on s.entry_id=e.id where not coalesce(s.deleted,false);
  return jsonb_build_object('canEdit',public._encyclopedia_can_edit(actor),'entries',entries);
end $$;

-- Service-only: the Edge function owns full document/raster validation. SQL
-- checks the small invariant envelope too, and is the authoritative capability,
-- revision, idempotency and deletion-fence transaction boundary.
create function public.encyclopedia_commit(p_actor uuid,p_operation text,p_command_id uuid,p_entry_id uuid,p_expected_revision bigint,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.encyclopedia_command_receipts%rowtype; s public.encyclopedia_entry_state%rowtype;
  e public.encyclopedia_entries%rowtype; intent text; current_revision bigint; next_revision bigint; k text; image_op text;
  image_bytes bytea; image_metadata jsonb;
begin
  perform public._deletion_service(); perform public._identity_lock(); perform public._deletion_require_available(p_actor);
  -- Hold the qualifying row: operator revocation and this commit serialize.
  perform 1 from public.encyclopedia_editors where user_id=p_actor for share;
  if not found then
    perform 1 from public.user_roles where user_id=p_actor and role='admin' for share;
    if not found then raise exception using errcode='42501',message='EDITOR_REQUIRED'; end if;
  end if;
  if p_operation is null or p_operation not in ('save','delete') or p_command_id is null or p_entry_id is null or
    p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=9007199254740991 or
    jsonb_typeof(p_patch) is distinct from 'object' or octet_length(p_patch::text)>8388608 then
    raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if p_operation='delete' and (p_expected_revision=0 or p_patch<>'{}'::jsonb) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('title','subtext','contentDocument','focalPointX','focalPointY','opacity','popupOpacity','titleColor','subtextColor','highlightEffect','image') then
      raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  end loop;
  if (p_patch?'title' and (jsonb_typeof(p_patch->'title') is distinct from 'string' or length(p_patch->>'title')>200 or btrim(p_patch->>'title')='')) or
     (p_patch?'subtext' and (jsonb_typeof(p_patch->'subtext') is distinct from 'string' or length(p_patch->>'subtext')>2000)) or
     (p_patch?'contentDocument' and (jsonb_typeof(p_patch->'contentDocument') is distinct from 'object' or p_patch#>'{contentDocument,version}' is distinct from '1'::jsonb or
       jsonb_typeof(p_patch#>'{contentDocument,blocks}') is distinct from 'array' or octet_length((p_patch->'contentDocument')::text)>524288)) then
    raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  foreach k in array array['focalPointX','focalPointY','opacity','popupOpacity'] loop
    if p_patch?k and p_patch->k<>'null'::jsonb then
      if jsonb_typeof(p_patch->k) is distinct from 'number' or (p_patch->>k)::numeric<0 or (p_patch->>k)::numeric>100 or
        trunc((p_patch->>k)::numeric)<>(p_patch->>k)::numeric then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    end if;
  end loop;
  foreach k in array array['titleColor','subtextColor'] loop
    if p_patch?k and p_patch->k<>'null'::jsonb and (jsonb_typeof(p_patch->k) is distinct from 'string' or
      not (p_patch->>k ~ '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$')) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  end loop;
  if p_patch?'highlightEffect' and jsonb_typeof(p_patch->'highlightEffect') not in ('boolean','null') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  image_op:=coalesce(p_patch#>>'{image,op}','keep');
  if p_patch?'image' then
    if jsonb_typeof(p_patch->'image') is distinct from 'object' or p_patch#>>'{image,op}' is null or image_op not in ('keep','remove','replace') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    if image_op='replace' then
      image_metadata:=p_patch#>'{image,metadata}';
      if not coalesce(p_patch#>>'{image,dataUrl}' ~ '^data:image/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$',false) or
        jsonb_typeof(image_metadata) is distinct from 'object' then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
      image_bytes:=decode(split_part(p_patch#>>'{image,dataUrl}',',',2),'base64');
      if octet_length(image_bytes) not between 1 and 5242880 or image_metadata->>'sha256' is distinct from encode(extensions.digest(image_bytes,'sha256'),'hex') or
        image_metadata->>'byteSize' is distinct from octet_length(image_bytes)::text or
        'data:'||(image_metadata->>'mimeType')||';base64' is distinct from split_part(p_patch#>>'{image,dataUrl}',',',1) then
        raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    end if;
  end if;
  intent:=encode(extensions.digest(jsonb_build_object('operation',p_operation,'entryId',p_entry_id,'expectedRevision',p_expected_revision,'patch',p_patch)::text,'sha256'),'hex');
  select * into r from public.encyclopedia_command_receipts where actor_user_id=p_actor and command_id=p_command_id;
  if found then
    if r.intent_hash<>intent then raise exception using errcode='23505',message='COMMAND_ID_REUSED'; end if;
    return jsonb_build_object('entryId',r.entry_id,'revision',r.revision,'deleted',r.deleted,'replayed',true);
  end if;
  select * into e from public.encyclopedia_entries where id=p_entry_id for update;
  select * into s from public.encyclopedia_entry_state where entry_id=p_entry_id for update;
  if p_expected_revision=0 then
    if s.entry_id is not null and s.deleted then raise exception using errcode='23505',message='ENTRY_ID_REUSED'; end if;
    if e.id is not null or s.entry_id is not null then raise exception using errcode='40001',message='ENTRY_REVISION_CONFLICT'; end if;
    if not(p_patch?'title' and p_patch?'subtext' and p_patch?'contentDocument') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
    insert into public.encyclopedia_entries(id,title,subtext) values(p_entry_id,p_patch->>'title',p_patch->>'subtext');
    current_revision:=0;
  else
    if e.id is null or coalesce(s.deleted,false) then raise exception using errcode='P0002',message='ENTRY_NOT_FOUND'; end if;
    current_revision:=coalesce(s.revision,1);
    if current_revision<>p_expected_revision then raise exception using errcode='40001',message='ENTRY_REVISION_CONFLICT'; end if;
  end if;
  next_revision:=current_revision+1;
  if p_operation='delete' then
    delete from public.encyclopedia_entries where id=p_entry_id;
  else
    update public.encyclopedia_entries set
      title=case when p_patch?'title' then p_patch->>'title' else title end,
      subtext=case when p_patch?'subtext' then p_patch->>'subtext' else subtext end,
      focal_point_x=case when p_patch?'focalPointX' then (p_patch->>'focalPointX')::integer else focal_point_x end,
      focal_point_y=case when p_patch?'focalPointY' then (p_patch->>'focalPointY')::integer else focal_point_y end,
      opacity=case when p_patch?'opacity' then (p_patch->>'opacity')::integer else opacity end,
      popup_opacity=case when p_patch?'popupOpacity' then (p_patch->>'popupOpacity')::integer else popup_opacity end,
      title_color=case when p_patch?'titleColor' then p_patch->>'titleColor' else title_color end,
      subtext_color=case when p_patch?'subtextColor' then p_patch->>'subtextColor' else subtext_color end,
      highlight_effect=case when p_patch?'highlightEffect' then (p_patch->>'highlightEffect')::boolean else highlight_effect end,
      image_url=case image_op when 'replace' then p_patch#>>'{image,dataUrl}' when 'remove' then null else image_url end,
      image_meta=case image_op when 'replace' then image_metadata when 'remove' then null else image_meta end,
      updated_at=clock_timestamp() where id=p_entry_id;
  end if;
  insert into public.encyclopedia_entry_state(entry_id,revision,content_document,deleted)
    values(p_entry_id,next_revision,case when p_operation='delete' then null when p_patch?'contentDocument' then p_patch->'contentDocument' else s.content_document end,p_operation='delete')
    on conflict(entry_id) do update set revision=excluded.revision,content_document=excluded.content_document,deleted=excluded.deleted;
  insert into public.encyclopedia_command_receipts(actor_user_id,command_id,intent_hash,entry_id,revision,deleted)
    values(p_actor,p_command_id,intent,p_entry_id,next_revision,p_operation='delete');
  return jsonb_build_object('entryId',p_entry_id,'revision',next_revision,'deleted',p_operation='delete','replayed',false);
end $$;
revoke all on function public._encyclopedia_can_edit(uuid),public.encyclopedia_check_editor(uuid),public.get_encyclopedia_library(),
  public.encyclopedia_commit(uuid,text,uuid,uuid,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.get_encyclopedia_library() to authenticated;
grant execute on function public.encyclopedia_check_editor(uuid),public.encyclopedia_commit(uuid,text,uuid,uuid,bigint,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
