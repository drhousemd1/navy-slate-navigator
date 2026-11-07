-- PREPARED ONLY: parent runs with the reviewed pinned native SQL wrapper.
-- Self-contained regression/comparison for 1400 -> 1500. Always ROLLBACK.
-- No fixture/account/Storage mutation. Prints counts and elapsed times only.
-- Candidate migration SHA256: 8f9b71cf0f551557a13fda82d1ec7a546a723c179bd77e20bd3397aab451d8ab
\set ON_ERROR_STOP on
\set VERBOSITY terse
begin;
set local statement_timeout='60s'; -- Comparison only; production timeout unchanged.
set local lock_timeout='5s';
set local client_min_messages='warning';
do $$ begin
  -- The wrapper pins external loopback20324; native Postgres reports internal5432.
  if current_setting('obedience.baseline_target',true) is distinct from 'isolated-local'
    or current_setting('port')<>'5432' or (inet_server_addr() is not null and inet_server_addr()<>inet '127.0.0.1') then
    raise exception 'Pinned native database required'; end if;
  if (select prosrc from pg_catalog.pg_proc where oid='public._deletion_references(jsonb,text,text)'::regprocedure) is distinct from $original_body$
declare v text; x jsonb;
begin
  if jsonb_typeof(p_value)='string' then
    v:=p_value #>> '{}';
    return v=p_path or v=p_bucket||'/'||p_path or
      public._deletion_decode_path(split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/object/',2)) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path) or
      public._deletion_decode_path(split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/render/image/',2)) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path);
  elsif jsonb_typeof(p_value)='array' then
    for x in select value from jsonb_array_elements(p_value) loop
      if public._deletion_references(x,p_bucket,p_path) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value)='object' then
    for x in select value from jsonb_each(p_value) loop
      if public._deletion_references(x,p_bucket,p_path) then return true; end if;
    end loop;
  end if;
  return false;
end $original_body$ then raise exception 'Expected unchanged 1400 helper'; end if;
  if (select prosrc from pg_catalog.pg_proc where oid='public._deletion_media_class(text,text,uuid)'::regprocedure) is distinct from $original_body$
declare t text; r record; keep_archive boolean:=false; keep_message boolean:=false;
begin
  select exists(select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.bucket_id=p_bucket and a.object_path=p_path and public._deletion_surviving_conversation(m.conversation_id,p_actor)) into keep_message;
  for t in select unnest(array['tasks','rewards','rules','punishments']) loop
    for r in execute format('select d.relationship_id,d.user_id,public._deletion_media_columns(to_jsonb(d)) media from public.%I d',t) loop
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
  -- Logos may be referenced by a browser-only saved selection, not a DB row.
  if p_bucket in ('logos','admin-documents') then return 'blocked'; end if;
  if keep_message then return 'message'; elsif keep_archive then return 'archive'; else return 'delete'; end if;
end $original_body$ then raise exception 'Expected unchanged 1400 helper'; end if;
end $$;
create temp table original_helper_metadata on commit drop as
  select oid,proowner,proacl,prosecdef,provolatile,proconfig,prorettype from pg_catalog.pg_proc
  where oid in ('public._deletion_references(jsonb,text,text)'::regprocedure,'public._deletion_media_class(text,text,uuid)'::regprocedure);
create temp table scan_results(stage text,cases integer,old_ms numeric,new_ms numeric) on commit drop;
create function pg_temp.old_deletion_references(p_value jsonb,p_bucket text,p_path text) returns boolean
language plpgsql immutable set search_path='' as $$
declare v text; x jsonb;
begin
  if jsonb_typeof(p_value)='string' then
    v:=p_value #>> '{}';
    return v=p_path or v=p_bucket||'/'||p_path or
      public._deletion_decode_path(split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/object/',2)) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path) or
      public._deletion_decode_path(split_part(split_part(split_part(v,'?',1),'#',1),'/storage/v1/render/image/',2)) in
        ('public/'||p_bucket||'/'||p_path,'authenticated/'||p_bucket||'/'||p_path,'sign/'||p_bucket||'/'||p_path);
  elsif jsonb_typeof(p_value)='array' then
    for x in select value from jsonb_array_elements(p_value) loop
      if pg_temp.old_deletion_references(x,p_bucket,p_path) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value)='object' then
    for x in select value from jsonb_each(p_value) loop
      if pg_temp.old_deletion_references(x,p_bucket,p_path) then return true; end if;
    end loop;
  end if;
  return false;
end $$;

create function pg_temp.old_deletion_media_class(p_bucket text,p_path text,p_actor uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare t text; r record; keep_archive boolean:=false; keep_message boolean:=false;
begin
  select exists(select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.bucket_id=p_bucket and a.object_path=p_path and public._deletion_surviving_conversation(m.conversation_id,p_actor)) into keep_message;
  for t in select unnest(array['tasks','rewards','rules','punishments']) loop
    for r in execute format('select d.relationship_id,d.user_id,public._deletion_media_columns(to_jsonb(d)) media from public.%I d',t) loop
      if pg_temp.old_deletion_references(r.media,p_bucket,p_path) and
        (r.user_id is distinct from p_actor or exists(select 1 from public.relationship_period_members
          where relationship_id=r.relationship_id and user_id is not null and user_id is distinct from p_actor)) then
        if r.relationship_id is null or exists(select 1 from public.relationship_periods where id=r.relationship_id and status='active') then return 'blocked'; end if;
        keep_archive:=true;
      end if;
    end loop;
  end loop;
  if exists(select 1 from public.profiles p where p.id is distinct from p_actor
      and pg_temp.old_deletion_references(to_jsonb(p.avatar_url),p_bucket,p_path)) or
     exists(select 1 from public.encyclopedia_entries e where pg_temp.old_deletion_references(to_jsonb(e),p_bucket,p_path)) or
     exists(select 1 from public.app_guide_content g where pg_temp.old_deletion_references(to_jsonb(g),p_bucket,p_path)) then return 'blocked'; end if;
  if exists(select 1 from public.retained_account_media a where a.bucket_id=p_bucket and a.object_path=p_path
    and exists(select 1 from public.relationship_period_members m join auth.users u on u.id=m.user_id
      where m.relationship_id=any(a.relationship_ids) and m.user_id is distinct from p_actor)) then keep_archive:=true; end if;
  -- Logos may be referenced by a browser-only saved selection, not a DB row.
  if p_bucket in ('logos','admin-documents') then return 'blocked'; end if;
  if keep_message then return 'message'; elsif keep_archive then return 'archive'; else return 'delete'; end if;
end $$;

-- Exact candidate body, enclosed by this script transaction.


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

-- A SQL null is different from JSON null; compare with IS DISTINCT FROM.
create temp table reference_cases(value jsonb,bucket text,path text) on commit drop;
insert into reference_cases
select v.value,b.bucket,p.path
from (values
 (null::jsonb),('null'::jsonb),('true'::jsonb),('42'::jsonb),('[]'::jsonb),('{}'::jsonb),
 (to_jsonb(''::text)),(to_jsonb('folder/a b/é.png'::text)),(to_jsonb('images/folder/a b/é.png'::text)),
 (to_jsonb('not-a-reference'::text)),
 (jsonb_build_array(null,jsonb_build_object('nested',jsonb_build_array('unrelated','images/folder/a b/é.png')))),
 (jsonb_build_object('first',jsonb_build_array(null,5),'second',jsonb_build_object('photo','folder/a b/é.png'))),
 (jsonb_build_array('data:image/png;base64,'||repeat('A',131072),'folder/a b/é.png')),
 (jsonb_build_object('inline','data:image/png;base64,'||repeat('A',131072),'other',jsonb_build_array(false,null)))
) v(value)
cross join (values ('images'::text),(''::text),(null::text)) b(bucket)
cross join (values ('folder/a b/é.png'::text),(''::text),(null::text)) p(path);
insert into reference_cases
select to_jsonb('https://example.invalid/storage/v1/'||kind||access||encoded||suffix),'images','folder/a b/é.png'
from (values ('object/'::text),('render/image/'::text)) k(kind)
cross join (values ('public/'::text),('authenticated/'::text),('sign/'::text)) a(access)
cross join (values ('images/folder/a b/é.png'::text),('images%2Ffolder%2Fa%20b%2F%C3%A9.png'::text),('images/folder/a%20b/%c3%a9.png'::text)) e(encoded)
cross join (values (''::text),('?token=synthetic#fragment'::text),('#fragment?token=synthetic'::text)) s(suffix);
insert into reference_cases values
 (to_jsonb('prefix?only=/storage/v1/object/public/images/folder/a b/é.png'::text),'images','folder/a b/é.png'),
 (to_jsonb('prefix#only=/storage/v1/render/image/sign/images/folder/a b/é.png'::text),'images','folder/a b/é.png'),
 (to_jsonb('/storage/v1/object/public/images/folder/a b/é.png/storage/v1/object/ignored'::text),'images','folder/a b/é.png'),
 (to_jsonb('/storage/v1/object/public/images/%FF'::text),'images','%FF'),
 (to_jsonb('/storage/v1/object/public/images/%ZZ'::text),'images','%ZZ'),
 (to_jsonb('/storage/v1/object/public/images/100%25.png'::text),'images','100%.png'),
 (to_jsonb('/storage/v1/object/public/images/a%252Fb.png'::text),'images','a%2Fb.png');
do $$ declare r record; n integer:=0; before_value boolean; after_value boolean; begin
  for r in select * from reference_cases loop
    before_value:=pg_temp.old_deletion_references(r.value,r.bucket,r.path);
    after_value:=public._deletion_references(r.value,r.bucket,r.path);
    if before_value is distinct from after_value then raise exception 'Reference result differs'; end if;
    n:=n+1;
  end loop;
  insert into scan_results values('synthetic reference values',n,null,null);
end $$;

-- Every real definition: exactly the same six values in the same order.
-- Actual payload traversal is covered by the single classifier comparison below.
create temp table scan_target on commit drop as select
  '__deletion_scan_'||gen_random_uuid()::text bucket,gen_random_uuid()::text path,gen_random_uuid() actor;
do $$ declare t text; projection text; r record; target record; n integer:=0; begin
  select * into target from scan_target;
  if exists(select 1 from storage.buckets where id=target.bucket) or exists(select 1 from auth.users where id=target.actor) then
    raise exception 'Synthetic comparison target collided'; end if;
  foreach t in array array['tasks','rewards','rules','punishments'] loop
    select string_agg(case when a.attname is null then 'null' else format('d.%I',a.attname) end,',' order by c.ordinality)
      into projection from unnest(array['background_image_url','background_images','background_image_path','icon_url','image_url','avatar_url']) with ordinality c(name,ordinality)
      left join pg_catalog.pg_attribute a on a.attrelid=format('public.%I',t)::regclass and a.attname=c.name and a.attnum>0 and not a.attisdropped;
    for r in execute format('select public._deletion_media_columns(to_jsonb(d)) old_media,jsonb_build_array(%s) new_media from public.%I d',projection,t) loop
      if r.old_media is distinct from r.new_media then raise exception 'Definition media projection differs'; end if;
      n:=n+1;
    end loop;
  end loop;
  insert into scan_results values('original definition projections',n,null,null);
end $$;

-- One original/new false-path classification traverses the actual global
-- payloads that caused the timeout. No repeated scans per object or actor.
-- No wall-clock speed assertion under host contention; report measurements.
do $$ declare target record; started timestamptz; old_ms numeric; new_ms numeric; a text; b text; begin
  select * into target from scan_target;
  started:=clock_timestamp(); a:=pg_temp.old_deletion_media_class(target.bucket,target.path,target.actor); old_ms:=extract(epoch from clock_timestamp()-started)*1000;
  started:=clock_timestamp(); b:=public._deletion_media_class(target.bucket,target.path,target.actor); new_ms:=extract(epoch from clock_timestamp()-started)*1000;
  if a is distinct from b then raise exception 'Timed classifier result differs'; end if;
  insert into scan_results values('original-payload false-path classification',1,round(old_ms,3),round(new_ms,3));
end $$;
do $$ begin
  if exists(select 1 from original_helper_metadata m join pg_catalog.pg_proc p on p.oid=m.oid
    where row(p.proowner,p.proacl,p.prosecdef,p.provolatile,p.proconfig,p.prorettype) is distinct from
      row(m.proowner,m.proacl,m.prosecdef,m.provolatile,m.proconfig,m.prorettype)) or
    (select count(*) from original_helper_metadata m join pg_catalog.pg_proc p on p.oid=m.oid)<>2 then
    raise exception 'Helper identity or access changed'; end if;
end $$;
select stage,cases,old_ms,new_ms from scan_results order by stage;
rollback;
