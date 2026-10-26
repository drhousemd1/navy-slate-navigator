-- Additive document-only access. Existing relationship/admin roles are unchanged.
-- Membership is maintained by a trusted database operator, never the app client.
create table public.admin_document_readers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_document_readers enable row level security;
revoke all on public.admin_document_readers from public, anon, authenticated;
grant select, insert, update, delete on public.admin_document_readers to service_role;

create function public.can_read_admin_document()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_document_readers where user_id = (select auth.uid())
  );
$$;
revoke all on function public.can_read_admin_document() from public;
grant execute on function public.can_read_admin_document() to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-documents', 'admin-documents', false, 10485760,
        array['text/html', 'application/json']);

create policy "Admin documents require trusted membership"
on storage.objects as restrictive for select to public
using (bucket_id <> 'admin-documents' or (select public.can_read_admin_document()));

create policy "Document readers can read private documents"
on storage.objects for select to authenticated
using (bucket_id = 'admin-documents' and (select public.can_read_admin_document()));

-- Browser uploads/moves/deletes cannot alter the publication, even if a broader
-- permissive Storage policy is introduced elsewhere in this legacy app later.
create policy "Admin document uploads use the operator"
on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'admin-documents');
create policy "Admin document updates use the operator"
on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'admin-documents') with check (bucket_id <> 'admin-documents');
create policy "Admin document deletes use the operator"
on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'admin-documents');

-- Intentionally no member is seeded by this public migration. A trusted
-- operator grants the requested account document-only access after review.
