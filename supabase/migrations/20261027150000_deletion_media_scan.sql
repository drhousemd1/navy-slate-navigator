-- Preserve deletion classification while avoiding full definition-row JSON and
-- materialized sets of large inline-image values. No data or access change.
begin;

create or replace function public._deletion_references(p_value jsonb,p_bucket text,p_path text) returns boolean
language plpgsql immutable set search_path='' as $$
declare v text; k text; i integer; matched boolean; object_suffix text:=''; render_suffix text:='';
begin
  if jsonb_typeof(p_value)='string' then
    v:=p_value #>> '{}';
    matched:=v=p_path or v=p_bucket||'/'||p_path;
    if matched then return true; end if;
    -- An absent marker produced an empty suffix in 1400. Keep that value and
    -- the comparisons below (including SQL NULL), without copying the entire
    -- inline image through repeated query/fragment splits.
    if strpos(v,'/storage/v1/object/')>0 then
      object_suffix:=split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/object/',2);
    end if;
    if strpos(v,'/storage/v1/render/image/')>0 then
      render_suffix:=split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/render/image/',2);
    end if;
    return matched or public._deletion_decode_path(object_suffix) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path) or
      public._deletion_decode_path(render_suffix) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path);
  elsif jsonb_typeof(p_value)='array' then
    -- Iterate positions, not an SRF tuplestore containing every image value.
    for i in 0..jsonb_array_length(p_value)-1 loop
      if public._deletion_references(p_value->i,p_bucket,p_path) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value)='object' then
    -- Keys are small; only the current value is extracted for recursion.
    for k in select jsonb_object_keys(p_value) loop
      if public._deletion_references(p_value->k,p_bucket,p_path) then return true; end if;
    end loop;
  end if;
  return false;
end $$;

create or replace function public._deletion_media_class(p_bucket text,p_path text,p_actor uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare t text; r record; projection text; keep_archive boolean:=false; keep_message boolean:=false;
begin
  select exists(select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.bucket_id=p_bucket and a.object_path=p_path and public._deletion_surviving_conversation(m.conversation_id,p_actor)) into keep_message;
  for t in select unnest(array['tasks','rewards','rules','punishments']) loop
    -- Preserve the six fields and their order, including JSON null for a field
    -- absent from a legacy table. Never serialize unrelated row content.
    select string_agg(case when a.attname is null then 'null' else format('d.%I',a.attname) end,',' order by c.ordinality)
      into projection
      from unnest(array['background_image_url','background_images','background_image_path','icon_url','image_url','avatar_url']) with ordinality c(name,ordinality)
      left join pg_catalog.pg_attribute a on a.attrelid=format('public.%I',t)::regclass
        and a.attname=c.name and a.attnum>0 and not a.attisdropped;
    for r in execute format('select d.relationship_id,d.user_id,jsonb_build_array(%s) media from public.%I d',projection,t) loop
      if public._deletion_references(r.media,p_bucket,p_path) and
        (r.user_id is distinct from p_actor or exists(select 1 from public.relationship_period_members
          where relationship_id=r.relationship_id and user_id is not null and user_id is distinct from p_actor)) then
        if r.relationship_id is null or exists(select 1 from public.relationship_periods where id=r.relationship_id and status='active') then return 'blocked'; end if;
        keep_archive:=true;
      end if;
    end loop;
  end loop;
  if exists(select 1 from public.profiles p where p.id is distinct from p_actor
      and public._deletion_references(to_jsonb(p.avatar_url),p_bucket,p_path)) or
     exists(select 1 from public.encyclopedia_entries e where public._deletion_references(to_jsonb(e),p_bucket,p_path)) or
     exists(select 1 from public.app_guide_content g where public._deletion_references(to_jsonb(g),p_bucket,p_path)) then return 'blocked'; end if;
  if exists(select 1 from public.retained_account_media a where a.bucket_id=p_bucket and a.object_path=p_path
    and exists(select 1 from public.relationship_period_members m join auth.users u on u.id=m.user_id
      where m.relationship_id=any(a.relationship_ids) and m.user_id is distinct from p_actor)) then keep_archive:=true; end if;
  if p_bucket in ('logos','admin-documents') then return 'blocked'; end if;
  if keep_message then return 'message'; elsif keep_archive then return 'archive'; else return 'delete'; end if;
end $$;

-- CREATE OR REPLACE preserves existing OIDs, owners and execution grants.
commit;
