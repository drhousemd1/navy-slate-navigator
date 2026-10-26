import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAdminDocumentAccess } from '@/features/admin-documents/useAdminDocumentAccess';
import { parseAdminDocumentManifest, verifyDocument, type AdminDocumentManifest } from '@/features/admin-documents/manifest';

type DocumentState = {
  userId: string;
  revision: number;
  html?: string;
  manifest?: AdminDocumentManifest;
  error?: boolean;
};

export default function AdminRebuildPlan() {
  const { user } = useAuth();
  const userId = user?.id;
  const [revision, setRevision] = useState(0);
  const access = useAdminDocumentAccess(true, revision);
  const [document, setDocument] = useState<DocumentState | null>(null);

  useEffect(() => {
    if (access !== 'allowed' || !userId) return;
    let active = true;
    async function load() {
      try {
        const bucket = supabase.storage.from('admin-documents');
        // This pinned Storage SDK predates the cacheNonce option. Its download
        // path preserves the query string, which forces a fresh version check.
        const current = await bucket.download(`current.json?cacheNonce=${crypto.randomUUID()}`);
        if (current.error || !current.data || current.data.size > 4096) throw new Error('Manifest unavailable');
        const manifest = parseAdminDocumentManifest(JSON.parse(await current.data.text()));
        const file = await bucket.download(manifest.object);
        if (file.error || !file.data) throw new Error('Document unavailable');
        const html = await verifyDocument(file.data, manifest.sha256);
        if (active) setDocument({ userId, revision, html, manifest });
      } catch {
        if (active) setDocument({ userId, revision, error: true });
      }
    }
    void load();
    return () => { active = false; };
  }, [access, userId, revision]);

  // Old account content is never rendered while a new identity or refresh loads.
  const current = access === 'allowed' && document?.userId === userId && document?.revision === revision
    ? document : null;
  const failure = access === 'error' || current?.error;

  return (
    <AppLayout>
      <section className="flex h-full min-h-[24rem] flex-col px-3 py-3 sm:px-5" aria-labelledby="rebuild-plan-heading">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
            <h1 id="rebuild-plan-heading" className="text-xl font-semibold">Rebuild plan</h1>
            {current?.manifest && <p className="text-xs text-slate-400">
              Updated {new Date(current.manifest.updatedAt).toLocaleString()}
            </p>}
          </div>
          <Button variant="outline" onClick={() => setRevision(value => value + 1)}>
            Refresh plan
          </Button>
        </header>
        {access === 'denied' ? (
          <p role="status" className="text-slate-300">This page is available only to the project administrator.</p>
        ) : failure ? (
          <div role="alert" className="rounded-lg border border-slate-600 p-5 text-slate-200">
            <p>The plan could not be loaded. It may not be published yet, or access could not be verified.</p>
            <p className="mt-2">Check your connection and use Refresh plan to try again.</p>
          </div>
        ) : current?.html ? (
          <>
            <p className="mb-2 text-xs text-slate-400">
              Baseline plan, written before this admin page was published. Maintained in Codex.
              Checkbox clicks here are temporary; source updates are published as a new version.
              Supporting files remain in the project workspace.
            </p>
            <iframe
              key={`${userId}-${revision}`}
              title={current.manifest.title}
              srcDoc={current.html}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              className="min-h-[24rem] w-full flex-1 rounded-lg border border-slate-600 bg-white"
            />
          </>
        ) : (
          <p role="status" className="text-slate-300">Loading the private plan…</p>
        )}
      </section>
    </AppLayout>
  );
}
