import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import type { EncyclopediaEntry, EncyclopediaPatch } from '@/types/encyclopedia';
import type { EncyclopediaDraft } from '@/data/encyclopedia/store';
import { entryDocument, safeLegacyImage } from '@/data/encyclopedia/content';
import { readEncyclopediaImage } from '@/data/encyclopedia/images';
import RichArticleEditor from './RichArticleEditor';
import ImageFocalPointControl from './image/ImageFocalPointControl';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface Props {
  isOpen: boolean; entry?: EncyclopediaEntry; draft: EncyclopediaDraft; canEdit: boolean; busy: boolean;
  error: string | null; storageError: string | null; notice: string | null; errorCode: string | null;
  onChange: (patch: EncyclopediaPatch) => void; onClose: () => void; onDiscard: () => void;
  onSubmit: (kind?: 'save' | 'delete') => Promise<void>; onReviewLatest: () => Promise<void>;
}
export default function EditEncyclopediaModal({ isOpen, entry, draft, canEdit, busy, error, storageError, notice, errorCode,
  onChange, onClose, onDiscard, onSubmit, onReviewLatest }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null); const [readingImage, setReadingImage] = useState(false);
  const imageGeneration = useRef(0);
  useEffect(() => () => { imageGeneration.current++; }, []);
  const locked = busy || !canEdit || errorCode === 'ENTRY_REVISION_CONFLICT' || Boolean(draft.receipt) || Boolean(draft.intent && !draft.rejected);
  const lockedRef = useRef(locked); lockedRef.current = locked;
  const patch = draft.patch;
  const has = (key: keyof EncyclopediaPatch) => Object.prototype.hasOwnProperty.call(patch, key);
  const number = (key: 'focalPointX' | 'focalPointY' | 'opacity' | 'popupOpacity', original: number | null | undefined, fallback: number) =>
    (has(key) ? patch[key] : original) ?? fallback;
  const x = number('focalPointX', entry?.focal_point_x, 50), y = number('focalPointY', entry?.focal_point_y, 50);
  const opacity = number('opacity', entry?.opacity, 100), popupOpacity = number('popupOpacity', entry?.popup_opacity ?? entry?.opacity, 100);
  const title = patch.title ?? entry?.title ?? '', subtext = patch.subtext ?? entry?.subtext ?? '';
  const imageUrl = patch.image?.op === 'remove' ? undefined : patch.image?.op === 'replace' ? patch.image.dataUrl : safeLegacyImage(entry?.image_url);
  const initialDocument = patch.contentDocument ?? (entry ? entryDocument(entry) : { version: 1 as const, blocks: [] });
  const positionFromPointer = (clientX: number, clientY: number) => {
    if (locked || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onChange({ focalPointX: Math.round(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100))),
      focalPointY: Math.round(Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100))) });
  };
  useEffect(() => {
    if (!dragging || locked) return;
    const mouse = (event: MouseEvent) => positionFromPointer(event.clientX, event.clientY);
    const touch = (event: TouchEvent) => { if (event.touches[0]) { event.preventDefault(); positionFromPointer(event.touches[0].clientX, event.touches[0].clientY); } };
    const end = () => setDragging(false);
    document.addEventListener('mousemove', mouse); document.addEventListener('mouseup', end);
    document.addEventListener('touchmove', touch, { passive: false }); document.addEventListener('touchend', end);
    return () => { document.removeEventListener('mousemove', mouse); document.removeEventListener('mouseup', end); document.removeEventListener('touchmove', touch); document.removeEventListener('touchend', end); };
  });
  const imageInput = async (file?: File) => {
    if (!file || locked) return;
    const token = ++imageGeneration.current; setReadingImage(true); setImageError(null);
    try { const dataUrl = await readEncyclopediaImage(file); if (imageGeneration.current === token && !lockedRef.current) onChange({ image: { op: 'replace', dataUrl } }); }
    catch (reason) { if (imageGeneration.current === token) setImageError(reason instanceof Error ? reason.message : 'Image could not be added.'); }
    finally { if (imageGeneration.current === token) setReadingImage(false); }
  };
  return <><Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="bg-navy border border-light-navy text-white max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="text-xl">{draft.expectedRevision > 0 ? 'Edit Encyclopedia Entry' : 'Create Encyclopedia Entry'}</DialogTitle></DialogHeader>
      <form className="space-y-6" onSubmit={event => { event.preventDefault(); void onSubmit(); }}>
        {(error || storageError || imageError) && <div role="alert" className="rounded border border-red-500 p-3 space-y-2">
          {error && <p>{error}</p>}{storageError && <p>{storageError}</p>}{imageError && <p>{imageError}</p>}
          {errorCode === 'ENTRY_REVISION_CONFLICT' && <Button type="button" disabled={busy || !canEdit} onClick={() => void onReviewLatest()}>Review latest version</Button>}
        </div>}
        {notice && <p role="status">{notice}</p>}
        {!canEdit && <p role="status">Editorial permission could not be confirmed. Your draft is kept.</p>}
        <div className="space-y-2"><label htmlFor="encyclopedia-title" className="text-sm font-medium leading-none text-white">Title</label><Input id="encyclopedia-title" aria-label="Title" placeholder="Enter title" className="bg-dark-navy border-light-navy text-white" value={title} maxLength={200} disabled={locked} onChange={e => onChange({ title: e.target.value })} /></div>
        <div className="space-y-2"><label htmlFor="encyclopedia-subtext" className="text-sm font-medium leading-none text-white">Description</label><Textarea id="encyclopedia-subtext" aria-label="Description" placeholder="Enter description" className="bg-dark-navy border-light-navy text-white" value={subtext} maxLength={2000} disabled={locked} onChange={e => onChange({ subtext: e.target.value })} /></div>
        <div className="space-y-2"><label className="text-sm font-medium leading-none text-white">Pop-up Text</label><RichArticleEditor initialDocument={initialDocument} disabled={locked} onChange={contentDocument => onChange({ contentDocument })} /></div>
        <div className="space-y-4"><div className="font-medium text-sm">Text Colors</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['titleColor', 'subtextColor'] as const).map((key, i) => {
            const original = i === 0 ? entry?.title_color : entry?.subtext_color;
            const value = (has(key) ? patch[key] : original) ?? (i === 0 ? '#FFFFFF' : '#D1D5DB');
            return <div key={key} className="space-y-2"><label htmlFor={`encyclopedia-${key}`} className="text-sm font-medium leading-none text-white">{i === 0 ? 'Title Color' : 'Description Color'}</label><div className="flex items-center gap-2">
              <input type="color" aria-label={i === 0 ? 'Choose title color' : 'Choose description color'} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#FFFFFF'} disabled={locked}
                className="w-12 h-10 rounded border border-light-navy cursor-pointer bg-transparent" style={{ backgroundColor: value, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                onChange={e => onChange({ [key]: e.target.value })} />
              <Input id={`encyclopedia-${key}`} aria-label={i === 0 ? 'Title Color' : 'Description Color'} value={value} placeholder="#FFFFFF" disabled={locked} className="flex-1 bg-dark-navy border-light-navy text-white font-mono text-sm" onChange={e => onChange({ [key]: e.target.value || null })} />
              </div>
            </div>;
          })}
        </div></div>
        <div className="flex flex-row items-center justify-between space-y-2"><div className="space-y-0.5"><label htmlFor="encyclopedia-highlight" className="text-sm font-medium leading-none text-white">Highlight Effect</label><p className="text-sm text-white">Apply a yellow highlight behind title and description</p></div><Switch id="encyclopedia-highlight" checked={(has('highlightEffect') ? patch.highlightEffect : entry?.highlight_effect) ?? false} disabled={locked} onCheckedChange={highlightEffect => onChange({ highlightEffect })} /></div>
        <div className="space-y-4">
          <label className="text-sm font-medium leading-none text-white">Background Image</label>
          <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center space-y-4" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void imageInput(event.dataTransfer.files?.[0]); }}>
          {readingImage && <p role="status">Reading image...</p>}
          {imageUrl && <input aria-label="Background Image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={locked || readingImage} hidden className="hidden" onChange={event => { void imageInput(event.target.files?.[0]); event.target.value = ''; }} />}
          {imageUrl && <div ref={previewRef} role="group" aria-label="Image focal point" tabIndex={locked ? -1 : 0}
            aria-description="Use arrow keys to position the image. Hold Shift for larger steps."
            className="relative w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active"
            onKeyDown={event => { if (locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const step = event.shiftKey ? 10 : 1; onChange(event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? { focalPointX: Math.max(0, Math.min(100, x + (event.key === 'ArrowRight' ? step : -step))) } : { focalPointY: Math.max(0, Math.min(100, y + (event.key === 'ArrowDown' ? step : -step))) }); }}><ImageFocalPointControl imagePreview={imageUrl} position={{ x, y }} opacity={opacity} isDragging={dragging}
              onMouseDown={event => { if (!locked) { event.preventDefault(); setDragging(true); positionFromPointer(event.clientX, event.clientY); } }}
              onTouchStart={event => { if (!locked && event.touches[0]) { setDragging(true); positionFromPointer(event.touches[0].clientX, event.touches[0].clientY); } }} /></div>}
            {imageUrl ? <Button type="button" variant="secondary" className="bg-dark-navy text-white hover:bg-light-navy" disabled={locked || readingImage} onClick={() => onChange({ image: { op: 'remove' } })}>Remove Image</Button> :
              <div className="relative h-32 flex flex-col items-center justify-center"><Upload aria-hidden="true" className="h-10 w-10 text-white mb-2" /><p className="text-white">Click to upload or drag and drop</p>
                <input aria-label="Background Image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={locked || readingImage}
                  onChange={e => { void imageInput(e.target.files?.[0]); e.target.value = ''; }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
              </div>}
          </div>
        </div>
        {imageUrl && <div className="space-y-4">
            {([['opacity', 'Tile Image Opacity', opacity], ['popupOpacity', 'Popup Image Opacity', popupOpacity]] as const).map(([key, label, value]) =>
              <div key={key} className="space-y-2"><label htmlFor={`encyclopedia-${key}`} className="text-sm font-medium leading-none text-white">{label} ({value}%)</label><Slider id={`encyclopedia-${key}`} aria-label={label} min={0} max={100} step={1} value={[value]} disabled={locked} onValueChange={([next]) => onChange({ [key]: next })} /></div>)}
        </div>}
        <DialogFooter className="pt-4 space-x-2">
          {canEdit && draft.expectedRevision > 0 && !draft.intent && <Button type="button" variant="destructive" className="mr-auto bg-red-700 hover:bg-red-800" disabled={locked} onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Delete</Button>}
          <Button type="button" variant="outline" className="bg-red-600 hover:bg-red-700 text-white border-red-600" onClick={onClose}>Cancel</Button>
          {Object.keys(draft.patch).length > 0 && (!draft.intent || draft.rejected) && <Button type="button" variant="outline" className="text-white" disabled={busy} onClick={onDiscard}>Discard draft</Button>}
          <Button type="submit" className="bg-nav-active text-white hover:bg-nav-active/80" disabled={busy || (!canEdit && !draft.receipt) || readingImage || errorCode === 'ENTRY_REVISION_CONFLICT'}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : draft.receipt ? 'Refresh library' : draft.intent && !draft.rejected ? 'Retry saved request' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog><DeleteConfirmationDialog isOpen={canEdit && confirmDelete} onOpenChange={setConfirmDelete} onDelete={() => { if (!locked) void onSubmit('delete'); }} isDeleting={locked} /></>;
}
