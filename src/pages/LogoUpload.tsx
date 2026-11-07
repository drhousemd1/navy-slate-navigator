import React, { useRef, useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { useLogoManager } from '@/hooks/useLogoManager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import { LogoImage } from '@/components/common/AppLogo';
import { logoSource } from '@/data/branding/schema';
import { LOGO_CONFIG } from '@/config/logoConfig';
import { supabaseBackendId } from '@/integrations/supabase/client';
const LogoUpload = () => {
  const manager = useLogoManager();
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const editable = manager.access === 'allowed';
  const enabled = editable && !!manager.history && !manager.busy;
  const historyCurrent = manager.history?.current;
  const current = manager.current.data && (!historyCurrent || manager.current.data.revision > historyCurrent.revision) ? manager.current.data : historyCurrent;
  return <AppLayout><div className="p-6 max-w-2xl mx-auto">
    <div className="text-center mb-8"><h1 className="text-3xl font-bold mb-2">Upload App Logo</h1>
      <p className="text-muted-foreground">One shared logo for everyone. Only the appointed app owner can change or restore it.</p></div>
    <Card className="p-6 mb-6"><h2 className="font-medium mb-3">Current logo</h2>
      <LogoImage source={logoSource(current?.version, supabaseBackendId)} className="h-40 w-full object-contain" />
      {manager.current.isError && <p role="status" className="text-sm mt-2">The current shared selection could not be refreshed. The last available artwork is shown.</p>}
    </Card>
    {manager.access === 'loading' && <p role="status">Checking logo editing access…</p>}
    {(manager.access === 'denied' || manager.access === 'error') && <Card className="p-6"><p>{manager.access === 'error' ? 'Logo editing access could not be verified.' : 'This account can view the shared logo. Editing and history are reserved for the app owner.'}</p>
      <Button className="mt-3" variant="outline" onClick={manager.refresh}>Refresh access</Button></Card>}
    {editable && <>
      <Card className="p-6 sm:p-8"><div className={`border-2 border-dashed rounded-lg p-6 sm:p-12 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
        onDrop={event => { event.preventDefault(); setDragOver(false); if (enabled && event.dataTransfer.files[0]) void manager.upload(event.dataTransfer.files[0]); }}
        onDragOver={event => { event.preventDefault(); if (enabled) setDragOver(true); }} onDragLeave={() => setDragOver(false)}>
        <ImageIcon aria-hidden="true" className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">{manager.busy ? 'Preparing and saving logo…' : dragOver ? 'Drop your logo here' : 'Drag and drop your logo here'}</p>
        <p className="text-sm text-muted-foreground mb-4">PNG, JPEG, WebP or SVG, up to 10 MB. SVG is safely converted to a raster image.</p>
        <input ref={input} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" aria-label="Choose app logo file"
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (enabled && file) void manager.upload(file); }} disabled={!enabled} />
        <Button type="button" disabled={!enabled} onClick={() => input.current?.click()}><Upload className="w-4 h-4 mr-2" aria-hidden="true" />Select Logo File</Button>
        {!manager.history && !manager.error && <p role="status" className="mt-3">Loading logo history…</p>}
      </div></Card>
      {manager.file && <p className="text-sm mt-3 break-words">Selected file: {manager.file.name}</p>}
      {manager.error && <p role="alert" className="mt-4">{manager.error}</p>}
      {manager.notice && <p role="status" className="mt-4">{manager.notice}</p>}
      <div className="flex flex-wrap gap-2 my-4">
        {(manager.pending || manager.file) && <Button onClick={() => void manager.retry()} disabled={!enabled}>Retry selected logo</Button>}
        <Button variant="outline" onClick={manager.refresh} disabled={manager.busy}>Refresh logo settings</Button>
      </div>
      {manager.history && <section aria-label="Previous app logos"><h2 className="text-xl font-semibold mb-3">Logo history</h2>
        <p className="text-sm text-muted-foreground mb-4">Published images are preserved. Restoring one changes the shared selection without deleting later versions.</p>
        <div className="space-y-3">{manager.history.versions.map(version => {
          const selected = current?.version.id === version.id;
          const title = version.id === LOGO_CONFIG.defaultVersionId ? 'Original app logo' : `Logo uploaded ${new Date(version.createdAt).toLocaleString()}`;
          return <Card key={version.id} className="p-4 flex flex-wrap items-center gap-4">
            <LogoImage source={logoSource(version, supabaseBackendId)} alt={title} className="h-20 w-20 object-contain" />
            <div className="flex-1 min-w-0"><p className="break-words">{title}</p>{selected && <p className="text-sm text-muted-foreground">Current logo</p>}</div>
            <Button variant="outline" disabled={!enabled || selected} onClick={() => void manager.restore(version.id)} aria-label={`Restore ${title}`}>{selected ? 'Current' : 'Restore'}</Button>
          </Card>;
        })}</div>
        <details className="mt-4"><summary className="cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500">Selection history</summary>
          <ol className="mt-2 text-sm space-y-2">{manager.history.selections.map(selection => <li key={selection.revision}>Selection {selection.revision} — {new Date(selection.selectedAt).toLocaleString()}{selection.versionId === LOGO_CONFIG.defaultVersionId ? ' — Original app logo' : ''}</li>)}</ol>
          {!manager.history.selections.length && <p className="text-sm mt-2">The original app logo is selected.</p>}
        </details>
      </section>}
    </>}
  </div></AppLayout>;
};
export default LogoUpload;
