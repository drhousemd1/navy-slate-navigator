-- PREPARED ONLY. Coordinate RPC clients + message-media endpoint + verified
-- legacy-media cutover before release. No account/lifecycle/accounting activation.
-- Account deletion remains a separate, gated operation.
begin;

create table public.message_conversations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  relationship_id uuid not null references public.relationship_periods(id),
  kind text not null check(kind in ('pair','legacy_self')),
  member_a uuid not null references public.relationship_period_members(participant_id),
  member_b uuid references public.relationship_period_members(participant_id),
  created_at timestamptz not null default now(),
  check((kind='pair' and member_b is not null and member_a<member_b) or
        (kind='legacy_self' and member_b is null)),
  unique(relationship_id,member_a,member_b)
);
create unique index message_self_conversation on public.message_conversations(relationship_id,member_a) where kind='legacy_self';
create index message_conversations_members_a on public.message_conversations(member_a);
create index message_conversations_members_b on public.message_conversations(member_b) where member_b is not null;

create table public.message_attachments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  upload_id uuid,
  uploader_participant_id uuid not null references public.relationship_period_members(participant_id),
  relationship_id uuid not null references public.relationship_periods(id),
  accepted_relationship_session_id uuid,
  bucket_id text not null check(bucket_id in ('message-media','message_images')),
  object_path text not null,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/gif','image/webp')),
  byte_size integer not null check(byte_size between 1 and 5242880),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in ('pending','ready')),
  verification_kind text not null check(verification_kind in ('endpoint_structure','baseline_manifest')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  message_id uuid unique references public.messages(id),
  unique(uploader_participant_id,upload_id),
  check(status<>'ready' or verified_at is not null)
);
create index message_attachments_period on public.message_attachments(relationship_id);
create unique index message_upload_object on public.message_attachments(bucket_id,object_path) where upload_id is not null;

alter table public.messages
  add column conversation_id uuid references public.message_conversations(id),
  add column sender_participant_id uuid references public.relationship_period_members(participant_id),
  add column receiver_participant_id uuid references public.relationship_period_members(participant_id),
  add column client_request_id uuid,
  add column accepted_relationship_session_id uuid,
  add column intent_hash text,
  add column attachment_id uuid unique references public.message_attachments(id),
  add column provenance text not null default 'legacy_messages' check(provenance in ('native','legacy_messages','legacy_archive')),
  add column read_status_known boolean not null default true;
alter table public.messages add constraint native_message_fields check(provenance<>'native' or
  (conversation_id is not null and sender_participant_id is not null and receiver_participant_id is not null
   and sender_participant_id<>receiver_participant_id and client_request_id is not null
   and accepted_relationship_session_id is not null and intent_hash is not null and image_url is null));
create unique index message_sender_request on public.messages(sender_participant_id,client_request_id) where client_request_id is not null;
create index message_conversation_cursor on public.messages(conversation_id,created_at desc,id desc);
create index message_conversation_unread on public.messages(conversation_id,receiver_participant_id) where read_at is null and read_status_known;

-- Retention uses stable participant references. Removing an Auth account must not
-- cascade message deletion or reveal a former identity through these old columns.
do $$ declare t text; begin
  foreach t in array array['messages','archived_messages'] loop
    execute format('alter table public.%I alter column sender_id drop not null, alter column receiver_id drop not null',t);
    execute format('alter table public.%I drop constraint %I, drop constraint %I',t,t||'_sender_id_fkey',t||'_receiver_id_fkey');
    execute format('alter table public.%I add constraint %I foreign key(sender_id) references auth.users(id) on delete set null, add constraint %I foreign key(receiver_id) references auth.users(id) on delete set null',t,t||'_sender_id_fkey',t||'_receiver_id_fkey');
    execute format('drop trigger if exists identity_stamp_period on public.%I',t);
    execute format('drop trigger if exists identity_direct_session on public.%I',t);
  end loop;
end $$;

create table public.message_legacy_sources (
  source_table text not null check(source_table in ('messages','archived_messages')),
  source_id uuid not null,
  canonical_message_id uuid not null references public.messages(id),
  source_hash text not null,
  primary key(source_table,source_id)
);
create table public.message_legacy_quarantine (
  source_table text not null,
  source_id uuid not null,
  source_hash text not null,
  reason text not null,
  primary key(source_table,source_id)
);
create table public.message_media_configuration (
  singleton boolean primary key default true check(singleton),
  legacy_private boolean not null default false
);
insert into public.message_media_configuration default values;

-- No raw account IDs, image paths, table changes or realtime row payloads are
-- client-readable. All public reads go through participant-checked DTO functions.
do $$ declare t text; p record; begin
  foreach t in array array['messages','archived_messages','message_conversations','message_attachments',
    'message_legacy_sources','message_legacy_quarantine','message_media_configuration'] loop
    execute format('alter table public.%I enable row level security',t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
  for p in select pubname,tablename from pg_publication_tables
    where schemaname='public' and tablename in('messages','archived_messages') loop
    -- FOR ALL TABLES publications cannot exclude a table: require operator review.
    if exists(select 1 from pg_publication where pubname=p.pubname and puballtables) then
      raise exception 'MESSAGES_REQUIRE_NON_GLOBAL_PUBLICATION';
    end if;
    execute format('alter publication %I drop table public.%I',p.pubname,p.tablename);
  end loop;
end $$;

create function public._messages_ensure_conversation(p_period uuid,p_a uuid,p_b uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_a uuid:=least(p_a,p_b); v_b uuid:=greatest(p_a,p_b);
begin
  if p_a is null or p_b is null or not exists(select 1 from public.relationship_period_members where participant_id=p_a and relationship_id=p_period)
     or not exists(select 1 from public.relationship_period_members where participant_id=p_b and relationship_id=p_period) then
    raise exception using errcode='22023',message='MESSAGE_PARTICIPANTS_INVALID';
  end if;
  if p_a=p_b then
    insert into public.message_conversations(relationship_id,kind,member_a) values(p_period,'legacy_self',p_a)
      on conflict(relationship_id,member_a) where kind='legacy_self' do nothing;
    select id into v_id from public.message_conversations where relationship_id=p_period and kind='legacy_self' and member_a=p_a;
  else
    insert into public.message_conversations(relationship_id,kind,member_a,member_b) values(p_period,'pair',v_a,v_b)
      on conflict(relationship_id,member_a,member_b) do nothing;
    select id into v_id from public.message_conversations where relationship_id=p_period and member_a=v_a and member_b=v_b;
  end if;
  return v_id;
end $$;

create function public.import_legacy_messages() returns jsonb
language plpgsql security definer set search_path='' as $$
declare x record; j jsonb; v_hash text; v_saved text; a uuid; b uuid; c uuid; target uuid; imported integer:=0; quarantined integer:=0;
begin
  perform public._identity_lock();
  for x in select 'messages'::text source,to_jsonb(m) data from public.messages m where m.provenance='legacy_messages'
    union all select 'archived_messages',to_jsonb(m) from public.archived_messages m order by source desc loop
    j:=x.data;
    -- Hash the preserved source fields only; metadata additions are not a new source.
    v_hash:=encode(extensions.digest(jsonb_build_object('sender',j->'sender_id','receiver',j->'receiver_id',
      'created',j->'created_at','content',j->'content','image',j->'image_url')::text,'sha256'),'hex');
    select source_hash into v_saved from public.message_legacy_sources where source_table=x.source and source_id=(j->>'id')::uuid;
    if found then
      if v_saved<>v_hash then raise exception using errcode='22023',message='LEGACY_MESSAGE_SOURCE_CHANGED'; end if;
      continue;
    end if;
    select participant_id into a from public.relationship_period_members where relationship_id=(j->>'relationship_id')::uuid and user_id=(j->>'sender_id')::uuid;
    select participant_id into b from public.relationship_period_members where relationship_id=(j->>'relationship_id')::uuid and user_id=(j->>'receiver_id')::uuid;
    if a is null or b is null then
      insert into public.message_legacy_quarantine values(x.source,(j->>'id')::uuid,v_hash,'PARTICIPANT_MAPPING_MISSING')
        on conflict(source_table,source_id) do update set source_hash=excluded.source_hash,reason=excluded.reason;
      quarantined:=quarantined+1; continue;
    end if;
    c:=public._messages_ensure_conversation((j->>'relationship_id')::uuid,a,b);
    if x.source='messages' then
      target:=(j->>'id')::uuid;
      update public.messages set conversation_id=c,sender_participant_id=a,receiver_participant_id=b where id=target;
    else
      -- Only actual participants + exact timestamp/content/image establish a duplicate.
      select id into target from public.messages where conversation_id=c and sender_participant_id=a and receiver_participant_id=b
        and created_at=(j->>'created_at')::timestamptz and content is not distinct from j->>'content'
        and image_url is not distinct from j->>'image_url' order by id limit 1;
      if target is null then
        target:=(j->>'id')::uuid;
        if exists(select 1 from public.messages where id=target) then target:=pg_catalog.gen_random_uuid(); end if;
        insert into public.messages(id,sender_id,receiver_id,content,image_url,created_at,relationship_id,conversation_id,
          sender_participant_id,receiver_participant_id,provenance,read_status_known)
        values(target,(j->>'sender_id')::uuid,(j->>'receiver_id')::uuid,j->>'content',j->>'image_url',(j->>'created_at')::timestamptz,
          (j->>'relationship_id')::uuid,c,a,b,'legacy_archive',false);
      end if;
    end if;
    insert into public.message_legacy_sources values(x.source,(j->>'id')::uuid,target,v_hash);
    delete from public.message_legacy_quarantine where source_table=x.source and source_id=(j->>'id')::uuid;
    imported:=imported+1;
  end loop;
  return jsonb_build_object('importedSources',imported,'quarantinedSources',quarantined);
end $$;
select public.import_legacy_messages();

create function public._messages_assert_scope(p_actor uuid,p_period uuid,p_session uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_member uuid; v_profile public.profiles%rowtype;
begin
  perform public._identity_lock();
  if p_actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select m.participant_id into v_member from public.identity_contexts c
    join public.relationship_periods r on r.id=c.relationship_id and r.status='active'
    join public.relationship_period_members m on m.relationship_id=r.id and m.user_id=c.user_id
    where c.user_id=p_actor and r.id=p_period;
  if v_member is null then raise exception using errcode='42501',message='STALE_RELATIONSHIP'; end if;
  if p_session is null or not exists(select 1 from public.relationship_periods where id=p_period and relationship_session_id=p_session) then
    raise exception using errcode='42501',message='STALE_RELATIONSHIP_SESSION'; end if;
  select * into v_profile from public.profiles where id=p_actor;
  if v_profile.role not in('dom','sub') or v_profile.role is null or
    not exists(select 1 from public.relationship_period_members where participant_id=v_member and role=v_profile.role) or
    (public._identity_peer(p_actor) is null and (v_profile.linked_partner_id is not null or
      (select count(*) from public.relationship_period_members where relationship_id=p_period)<>1
      or exists(select 1 from public.profiles where linked_partner_id=p_actor))) then
    raise exception using errcode='42501',message='VALID_IDENTITY_REQUIRED'; end if;
  return v_member;
end $$;

create function public._messages_can_read(p_actor uuid,p_conversation uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.message_conversations c join public.relationship_period_members m
   on m.participant_id in(c.member_a,c.member_b) where c.id=p_conversation and m.user_id=p_actor);
$$;

create function public._messages_summary(p_actor uuid,p_conversation uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.message_conversations%rowtype; r public.relationship_periods%rowtype; me uuid; peer uuid; other_user uuid;
  current_pair boolean:=false; label text; avatar text; unread bigint;
begin
  if not public._messages_can_read(p_actor,p_conversation) then raise exception using errcode='42501',message='CONVERSATION_NOT_FOUND'; end if;
  select * into strict c from public.message_conversations where id=p_conversation;
  select * into strict r from public.relationship_periods where id=c.relationship_id;
  select participant_id into me from public.relationship_period_members where participant_id in(c.member_a,c.member_b) and user_id=p_actor;
  peer:=case when c.member_a=me then c.member_b else c.member_a end;
  select user_id into other_user from public.relationship_period_members where participant_id=peer;
  current_pair:=c.kind='pair' and r.status='active' and other_user is not null
    and public._identity_peer(p_actor)=other_user
    and exists(select 1 from public.identity_contexts where user_id=p_actor and relationship_id=c.relationship_id);
  if c.kind='legacy_self' then label:='Saved self-messages';
  elsif current_pair then
    select coalesce(nullif(btrim(nickname),''),'Your partner'),avatar_url into label,avatar from public.profiles where id=other_user;
  elsif other_user is null then label:='Deleted account';
  else label:='Former partner'; end if;
  select count(*) into unread from public.messages where conversation_id=c.id and receiver_participant_id=me
    and sender_participant_id<>me and read_at is null and read_status_known;
  return jsonb_build_object('id',c.id,'kind',c.kind,'state',case when current_pair then 'current' else 'archived' end,
    'startedAt',r.started_at,'endedAt',case when current_pair then null else r.ended_at end,
    'lastMessageAt',(select max(created_at) from public.messages where conversation_id=c.id),'canSend',current_pair,
    'label',label,'partnerAvatarUrl',case when current_pair then avatar end,'unreadCount',unread);
end $$;

create function public.get_my_conversations(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid; peer uuid; current_id uuid; result jsonb;
begin
  me:=public._messages_assert_scope(auth.uid(),p_expected_relationship_id,p_expected_relationship_session_id);
  select participant_id into peer from public.relationship_period_members where relationship_id=p_expected_relationship_id and user_id=public._identity_peer(auth.uid());
  if peer is not null then current_id:=public._messages_ensure_conversation(p_expected_relationship_id,me,peer); end if;
  select coalesce(jsonb_agg(public._messages_summary(auth.uid(),c.id) order by c.created_at desc,c.id),'[]'::jsonb) into result
    from public.message_conversations c where public._messages_can_read(auth.uid(),c.id);
  return jsonb_build_object('currentConversationId',current_id,'conversations',result);
end $$;

create function public.get_conversation_messages(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,p_conversation_id uuid,
  p_before_created_at timestamptz default null,p_before_message_id uuid default null,p_limit integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare summary jsonb; result jsonb; cursor jsonb; oldest timestamptz; oldest_id uuid;
begin
  perform public._messages_assert_scope(auth.uid(),p_expected_relationship_id,p_expected_relationship_session_id);
  summary:=public._messages_summary(auth.uid(),p_conversation_id);
  if p_limit is null or p_limit<1 or p_limit>100 or (p_before_created_at is null)<>(p_before_message_id is null) then
    raise exception using errcode='22023',message='MESSAGE_PAGE_INVALID'; end if;
  with page as(select m.* from public.messages m where conversation_id=p_conversation_id
      and (p_before_created_at is null or (created_at,id)<(p_before_created_at,p_before_message_id)) order by created_at desc,id desc limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'createdAt',m.created_at,'author',case when sender.user_id=auth.uid() then 'you' else 'partner' end,
    'content',m.content,'attachment',case when a.status='ready' then jsonb_build_object('id',a.id,'mimeType',a.mime_type,'byteSize',a.byte_size) end,
    'readAt',m.read_at,'readStatus',case when m.read_at is not null then 'read' when m.read_status_known then 'unread' else 'unknown' end,
    'provenance',m.provenance) order by m.created_at,m.id),'[]'::jsonb) into result
    from page m join public.relationship_period_members sender on sender.participant_id=m.sender_participant_id
    left join public.message_attachments a on a.id=m.attachment_id;
  oldest:=(result->0->>'createdAt')::timestamptz;oldest_id:=(result->0->>'id')::uuid;
  if exists(select 1 from public.messages where conversation_id=p_conversation_id and (created_at,id)<(oldest,oldest_id)) then
    cursor:=jsonb_build_object('createdAt',oldest,'messageId',oldest_id); end if;
  return jsonb_build_object('conversation',summary,'messages',result,'nextBefore',cursor);
end $$;

create function public._messages_receipt(p_message uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('commandId',client_request_id,'conversationId',conversation_id,'messageId',id,'confirmedAt',created_at)
   from public.messages where id=p_message and provenance='native';
$$;
create function public.get_my_message_receipt(p_command_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select m.id into v_id from public.messages m join public.relationship_period_members p on p.participant_id=m.sender_participant_id
    where p.user_id=auth.uid() and m.client_request_id=p_command_id and m.provenance='native';
  return public._messages_receipt(v_id);
end $$;

create function public.send_message(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,p_command_id uuid,
  p_conversation_id uuid,p_content text,p_attachment_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); me uuid; peer uuid; other_user uuid; c public.message_conversations%rowtype;
  old public.messages%rowtype; a public.message_attachments%rowtype; v_hash text; v_id uuid; v_at timestamptz;
begin
  if actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._identity_lock();
  if p_command_id is null or p_conversation_id is null or (p_content is not null and char_length(p_content)>10000)
     or (coalesce(btrim(p_content),'')='' and p_attachment_id is null) then
    raise exception using errcode='22023',message='MESSAGE_CONTENT_INVALID'; end if;
  v_hash:=encode(extensions.digest(jsonb_build_object('period',p_expected_relationship_id,'session',p_expected_relationship_session_id,
    'conversation',p_conversation_id,'content',p_content,'attachment',p_attachment_id)::text,'sha256'),'hex');
  select m.* into old from public.messages m join public.relationship_period_members p on p.participant_id=m.sender_participant_id
    where p.user_id=actor and m.client_request_id=p_command_id;
  if found then
    if old.intent_hash is distinct from v_hash then raise exception using errcode='22023',message='MESSAGE_COMMAND_ID_REUSED'; end if;
    return public._messages_receipt(old.id); -- Exact accepted request only; never a new action across a changed session.
  end if;
  me:=public._messages_assert_scope(actor,p_expected_relationship_id,p_expected_relationship_session_id);
  other_user:=public._identity_peer(actor);
  if other_user is null then raise exception using errcode='42501',message='MESSAGE_PARTNER_REQUIRED'; end if;
  select participant_id into peer from public.relationship_period_members where relationship_id=p_expected_relationship_id and user_id=other_user;
  select * into c from public.message_conversations where id=p_conversation_id;
  if c.id is null or c.relationship_id<>p_expected_relationship_id or c.kind<>'pair'
     or c.member_a<>least(me,peer) or c.member_b<>greatest(me,peer) then
    raise exception using errcode='42501',message='CONVERSATION_NOT_SENDABLE'; end if;
  if p_attachment_id is not null then
    select * into a from public.message_attachments where id=p_attachment_id for update;
    if a.id is null or a.status<>'ready' or a.uploader_participant_id<>me or a.relationship_id<>p_expected_relationship_id
      or a.accepted_relationship_session_id is distinct from p_expected_relationship_session_id or a.message_id is not null then
      raise exception using errcode='42501',message='MESSAGE_ATTACHMENT_UNAVAILABLE'; end if;
  end if;
  v_at:=clock_timestamp();
  insert into public.messages(sender_id,receiver_id,relationship_id,conversation_id,sender_participant_id,receiver_participant_id,
    client_request_id,accepted_relationship_session_id,intent_hash,content,attachment_id,created_at,provenance)
  values(actor,other_user,p_expected_relationship_id,c.id,me,peer,p_command_id,p_expected_relationship_session_id,v_hash,p_content,p_attachment_id,v_at,'native') returning id into v_id;
  if p_attachment_id is not null then update public.message_attachments set message_id=v_id where id=p_attachment_id; end if;
  -- Future notification jobs may observe this committed ID; no legacy push invocation.
  return public._messages_receipt(v_id);
end $$;

create function public.acknowledge_conversation_messages(p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,
  p_conversation_id uuid,p_message_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ids uuid[]; v_at timestamptz:=clock_timestamp();
begin
  perform public._messages_assert_scope(auth.uid(),p_expected_relationship_id,p_expected_relationship_session_id);
  if not public._messages_can_read(auth.uid(),p_conversation_id) then raise exception using errcode='42501',message='CONVERSATION_NOT_FOUND'; end if;
  if p_message_ids is null or cardinality(p_message_ids)>100 or array_position(p_message_ids,null) is not null then
    raise exception using errcode='22023',message='MESSAGE_ACK_INVALID'; end if;
  if exists(select 1 from unnest(p_message_ids) requested(id) where not exists(select 1 from public.messages m
    join public.relationship_period_members p on p.participant_id=m.receiver_participant_id
    where m.id=requested.id and m.conversation_id=p_conversation_id and p.user_id=auth.uid() and m.sender_participant_id<>m.receiver_participant_id)) then
    raise exception using errcode='42501',message='MESSAGE_ACK_INVALID'; end if;
  update public.messages set read_at=coalesce(read_at,v_at),read_status_known=true where id=any(p_message_ids) and conversation_id=p_conversation_id;
  select coalesce(array_agg(distinct id),'{}'::uuid[]) into ids from unnest(p_message_ids) x(id);
  return jsonb_build_object('acknowledgedMessageIds',ids,'acknowledgedAt',v_at);
end $$;

-- Media service contracts: actor is obtained by the endpoint from Auth /user,
-- never from the multipart body. All three helpers are service-only.
create function public.message_media_begin(p_actor uuid,p_upload_id uuid,p_expected_relationship_id uuid,p_expected_relationship_session_id uuid,
  p_mime_type text,p_byte_size integer,p_sha256 text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid; a public.message_attachments%rowtype; v_id uuid:=pg_catalog.gen_random_uuid();
begin
  me:=public._messages_assert_scope(p_actor,p_expected_relationship_id,p_expected_relationship_session_id);
  if public._identity_peer(p_actor) is null then raise exception using errcode='42501',message='MESSAGE_PARTNER_REQUIRED'; end if;
  if p_upload_id is null or p_mime_type not in('image/jpeg','image/png','image/gif','image/webp') or p_byte_size not between 1 and 5242880 or p_sha256 !~ '^[a-f0-9]{64}$'
     or p_mime_type is null or p_byte_size is null or p_sha256 is null then
    raise exception using errcode='22023',message='MESSAGE_MEDIA_INVALID'; end if;
  select * into a from public.message_attachments where uploader_participant_id=me and upload_id=p_upload_id for update;
  if found then
    if a.sha256<>p_sha256 or a.byte_size<>p_byte_size or a.mime_type<>p_mime_type or a.accepted_relationship_session_id<>p_expected_relationship_session_id then
      raise exception using errcode='22023',message='MESSAGE_UPLOAD_ID_REUSED'; end if;
  else
    insert into public.message_attachments(id,upload_id,uploader_participant_id,relationship_id,accepted_relationship_session_id,
      bucket_id,object_path,mime_type,byte_size,sha256,verification_kind)
    values(v_id,p_upload_id,me,p_expected_relationship_id,p_expected_relationship_session_id,'message-media',v_id::text,
      p_mime_type,p_byte_size,p_sha256,'endpoint_structure') returning * into a;
  end if;
  return jsonb_build_object('attachmentId',a.id,'bucket',a.bucket_id,'objectPath',a.object_path,'mimeType',a.mime_type,'byteSize',a.byte_size,'sha256',a.sha256,'status',a.status);
end $$;

create function public.message_media_finalize(p_actor uuid,p_attachment_id uuid,p_sha256 text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.message_attachments%rowtype; me uuid;
begin
  perform public._identity_lock();
  select * into a from public.message_attachments where id=p_attachment_id for update;
  if a.id is null then raise exception using errcode='42501',message='MESSAGE_ATTACHMENT_UNAVAILABLE'; end if;
  me:=public._messages_assert_scope(p_actor,a.relationship_id,a.accepted_relationship_session_id);
  if a.uploader_participant_id<>me or a.sha256 is distinct from p_sha256 or a.verification_kind<>'endpoint_structure'
    or not exists(select 1 from storage.objects where bucket_id=a.bucket_id and name=a.object_path
      and (metadata->>'size')::bigint=a.byte_size and metadata->>'mimetype'=a.mime_type) then
    raise exception using errcode='42501',message='MESSAGE_ATTACHMENT_UNAVAILABLE'; end if;
  update public.message_attachments set status='ready',verified_at=coalesce(verified_at,clock_timestamp()) where id=a.id;
  return jsonb_build_object('attachmentId',a.id,'mimeType',a.mime_type,'byteSize',a.byte_size,'status','ready');
end $$;

create function public.message_media_read(p_actor uuid,p_attachment_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.message_attachments%rowtype; allowed boolean;
begin
  if p_actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public._identity_lock();
  select * into a from public.message_attachments where id=p_attachment_id;
  if a.message_id is null then
    allowed:=exists(select 1 from public.relationship_period_members where participant_id=a.uploader_participant_id and user_id=p_actor);
  else
    select public._messages_can_read(p_actor,conversation_id) into allowed from public.messages where id=a.message_id and attachment_id=a.id;
  end if;
  if a.id is null or a.status<>'ready' or not coalesce(allowed,false) then raise exception using errcode='42501',message='MESSAGE_ATTACHMENT_UNAVAILABLE'; end if;
  return jsonb_build_object('attachmentId',a.id,'bucket',a.bucket_id,'objectPath',a.object_path,'mimeType',a.mime_type,'byteSize',a.byte_size,'sha256',a.sha256);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('message-media','message-media',false,5242880,array['image/jpeg','image/png','image/gif','image/webp']);
create policy message_media_private_fence on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'message-media') with check(bucket_id<>'message-media');

-- A reviewed local helper verifies every baseline byte against the existing
-- manifest and passes exact source references. SQL verifies metadata/ownership,
-- but cannot independently decode/hash Storage bytes: no such claim is made.
create function public.register_legacy_message_media(p_entries jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e jsonb; m public.messages%rowtype; a public.message_attachments%rowtype; v_id uuid; count_registered integer:=0;
begin
  perform public._identity_lock();
  if jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>1000 then raise exception 'LEGACY_MEDIA_MANIFEST_INVALID'; end if;
  for e in select * from jsonb_array_elements(p_entries) loop
    select msg.* into m from public.message_legacy_sources s join public.messages msg on msg.id=s.canonical_message_id
      where s.source_table=e->>'sourceTable' and s.source_id=(e->>'sourceId')::uuid;
    if m.id is null or m.image_url is distinct from e->>'imageUrl' or e->>'bucket'<>'message_images'
      or not exists(select 1 from storage.objects where bucket_id='message_images' and name=e->>'objectPath'
        and (metadata->>'size')::bigint=(e->>'byteSize')::integer and metadata->>'mimetype'=e->>'mimeType') then
      raise exception using errcode='22023',message='LEGACY_MEDIA_MAPPING_INVALID'; end if;
    if m.attachment_id is not null then
      select * into a from public.message_attachments where id=m.attachment_id;
      if a.object_path is distinct from e->>'objectPath' or a.sha256 is distinct from e->>'sha256' or a.mime_type is distinct from e->>'mimeType'
         or a.byte_size is distinct from (e->>'byteSize')::integer then raise exception 'LEGACY_MEDIA_MAPPING_CHANGED'; end if;
    else
      insert into public.message_attachments(uploader_participant_id,relationship_id,bucket_id,object_path,mime_type,byte_size,sha256,
        status,verification_kind,verified_at,message_id)
      values(m.sender_participant_id,m.relationship_id,'message_images',e->>'objectPath',e->>'mimeType',(e->>'byteSize')::integer,e->>'sha256',
        'ready','baseline_manifest',clock_timestamp(),m.id) returning id into v_id;
      update public.messages set attachment_id=v_id where id=m.id;
      count_registered:=count_registered+1;
    end if;
  end loop;
  return jsonb_build_object('registered',count_registered);
end $$;

create function public.cutover_legacy_message_media() returns jsonb
language plpgsql security definer set search_path='' as $$
declare p record;
begin
  perform public._identity_lock();
  if exists(select 1 from public.message_legacy_quarantine) or exists(select 1 from public.messages m where m.image_url is not null
     and not exists(select 1 from public.message_attachments a where a.id=m.attachment_id and a.message_id=m.id and a.status='ready'))
     or exists(select 1 from public.archived_messages m where m.image_url is not null and not exists(select 1 from public.message_legacy_sources s
       join public.messages c on c.id=s.canonical_message_id join public.message_attachments a on a.id=c.attachment_id
       where s.source_table='archived_messages' and s.source_id=m.id and a.status='ready')) then
    raise exception using errcode='22023',message='LEGACY_MEDIA_CUTOVER_INCOMPLETE'; end if;
  update storage.buckets set public=false where id='message_images';
  for p in select policyname,coalesce(qual,'')||coalesce(with_check,'') expression from pg_policies where schemaname='storage' and tablename='objects'
    and policyname in('Allow authenticated users to upload images','Public read access','Users can upload their own message images',
      'Users can view message images they''re authorized to see') loop
    if strpos(p.expression,quote_literal('message_images'))=0 or exists(select 1 from storage.buckets b
      where b.id<>'message_images' and strpos(p.expression,quote_literal(b.id))>0) then
      raise exception 'LEGACY_MEDIA_POLICY_REVIEW_REQUIRED'; end if;
    execute format('drop policy %I on storage.objects',p.policyname);
  end loop;
  drop policy message_media_private_fence on storage.objects;
  create policy message_media_private_fence on storage.objects as restrictive for all to anon,authenticated
    using(bucket_id not in('message-media','message_images')) with check(bucket_id not in('message-media','message_images'));
  update public.message_media_configuration set legacy_private=true where singleton=true;
  return jsonb_build_object('legacyPrivate',true);
end $$;

-- Account deletion is not a partially supported message operation. Preserve the
-- old function OID/ACL while fencing every account until retained-history cleanup.
create or replace function public.delete_user_account() returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  raise exception using errcode='42501',message='ACCOUNT_DELETION_INTEGRATION_REQUIRED';
end $$;

-- New functions receive no default PUBLIC execute; private helpers are never APIs.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like '\_messages\_%' escape '\' or p.proname in
      ('import_legacy_messages','get_my_conversations','get_conversation_messages','get_my_message_receipt','send_message',
       'acknowledge_conversation_messages','message_media_begin','message_media_finalize','message_media_read','register_legacy_message_media','cutover_legacy_message_media')) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end $$;
grant execute on function public.get_my_conversations(uuid,uuid),public.get_conversation_messages(uuid,uuid,uuid,timestamptz,uuid,integer),
  public.get_my_message_receipt(uuid),public.send_message(uuid,uuid,uuid,uuid,text,uuid),public.acknowledge_conversation_messages(uuid,uuid,uuid,uuid[]) to authenticated;
grant execute on function public.import_legacy_messages(),public.message_media_begin(uuid,uuid,uuid,uuid,text,integer,text),
  public.message_media_finalize(uuid,uuid,text),public.message_media_read(uuid,uuid),public.register_legacy_message_media(jsonb),
  public.cutover_legacy_message_media() to service_role;
notify pgrst,'reload schema';
commit;
