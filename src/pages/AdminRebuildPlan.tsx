import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase, supabaseBackendId, supabasePublicKey } from '@/integrations/supabase/client';
import { useAdminDocumentAccess } from '@/features/admin-documents/useAdminDocumentAccess';
import { PublicationError, readPublication, type VerifiedPublication } from '../features/admin-documents/publication';
import { createPublicationStore } from '../features/admin-documents/storage';

type DocumentState = { userId: string; revision: number; publication: VerifiedPublication };
type RequestState = { userId: string; revision: number; error?: boolean; pending?: boolean };
const historicalBaselines = new Set([
  '1785c7f5dd8a3fd7469dc87ab2e6285fe2b78e627fc990a82a79e871551cd672',
  '7e8bf6a105131ec915016edc24e48761c8f8c94b618802c6e1af09b71d2712ac',
]);

export default function AdminRebuildPlan() {
  const { user } = useAuth();
  const userId = user?.id;
  const [revision, setRevision] = useState(0);
  const access = useAdminDocumentAccess(true, revision);
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [request, setRequest] = useState<RequestState | null>(null);

  useEffect(() => {
    // Never retain an earlier identity's document or a definitively denied one.
    setDocument(value => value?.userId === userId && access !== 'denied' && access !== 'error' ? value : null);
    if (access !== 'allowed' || !userId) return;
    let active = true;
    const controller = new AbortController();
    setRequest({ userId, revision, pending: true });
    async function load() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || data.session?.user.id !== userId || !data.session.access_token) throw new PublicationError('access', 'Session unavailable');
        const store = createPublicationStore({ targetUrl: supabaseBackendId, apiKey: supabasePublicKey,
          bearer: data.session.access_token, local: new URL(supabaseBackendId).protocol === 'http:', signal: controller.signal });
        const publication = await readPublication(store);
        if (active) {
          setDocument({ userId, revision, publication });
          setRequest({ userId, revision });
        }
      } catch (error) {
        if (active) {
          // A permission failure is not an offline/stale-document allowance.
          if (error instanceof PublicationError && error.code === 'access') setDocument(null);
          setRequest({ userId, revision, error: true });
        }
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [access, userId, revision]);

  // A previous verified version is usable only by this same identity after its
  // current membership check has affirmatively passed. It is visibly stale.
  const current = access === 'allowed' && document?.userId === userId ? document : null;
  const failed = access === 'error' || (request?.userId === userId && request.revision === revision && request.error);
  const pending = request?.userId === userId && request.revision === revision && request.pending;
  const stale = current && (current.revision !== revision || pending || failed);
  const publication = current?.publication;

  return <AppLayout>
    <section className="flex h-full min-h-[24rem] flex-col px-3 py-3 sm:px-5" aria-labelledby="rebuild-plan-heading">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
          <h1 id="rebuild-plan-heading" className="text-xl font-semibold">Rebuild plan</h1>
          {publication && <p className="text-xs text-slate-400">
            Published {new Date(publication.publishedAt).toLocaleString()}
          </p>}
        </div>
        <Button variant="outline" onClick={() => setRevision(value => value + 1)}>Refresh plan</Button>
      </header>
      {access === 'denied' ? <p role="status" className="text-slate-300">This page is available only to the project administrator.</p> :
        !publication && failed ? <div role="alert" className="rounded-lg border border-slate-600 p-5 text-slate-200">
          <p>The plan could not be loaded. It may not be published yet, or access could not be verified.</p>
          <p className="mt-2">Check your connection and use Refresh plan to try again.</p>
        </div> : publication ? <>
          {stale && <p role={failed ? 'alert' : 'status'} className="mb-2 text-sm text-slate-300">
            {failed ? 'Refresh failed. Showing the last verified version.' : 'Checking for updates…'}
          </p>}
          <p className="mb-2 text-xs text-slate-400">
            {historicalBaselines.has(publication.manifest.sha256) && 'Historical plan; later implementation changes are not included. '}
            Maintained in Codex. Checkbox changes here are temporary.
          </p>
          <iframe key={`${userId}-${publication.head.sha256}`} title={publication.manifest.title} srcDoc={publication.html}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"
            className="min-h-[24rem] w-full flex-1 rounded-lg border border-slate-600 bg-white" />
        </> : <p role="status" className="text-slate-300">Loading the private plan…</p>}
    </section>
  </AppLayout>;
}
