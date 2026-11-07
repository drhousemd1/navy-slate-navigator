import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EncyclopediaEntry, EncyclopediaPatch } from '@/types/encyclopedia';
import type { EncyclopediaDraft } from '@/data/encyclopedia/store';
import { entryDocument, safeLegacyImage } from '@/data/encyclopedia/content';
import { readEncyclopediaImage } from '@/data/encyclopedia/images';
import RichArticleEditor from './RichArticleEditor';
import ImageFocalPointControl from './image/ImageFocalPointControl';

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
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="bg-navy border border-light-navy text-foreground max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{draft.expectedRevision > 0 ? 'Edit Encyclopedia Entry' : 'Create Encyclopedia Entry'}</DialogTitle></DialogHeader>
      <form className="space-y-6" onSubmit={event => { event.preventDefault(); void onSubmit(); }}>
        {(error || storageError || imageError) && <div role="alert" className="rounded border border-red-500 p-3 space-y-2">
          {error && <p>{error}</p>}{storageError && <p>{storageError}</p>}{imageError && <p>{imageError}</p>}
          {errorCode === 'ENTRY_REVISION_CONFLICT' && <Button type="button" disabled={busy || !canEdit} onClick={() => void onReviewLatest()}>Review latest version</Button>}
        </div>}
        {notice && <p role="status">{notice}</p>}
        {!canEdit && <p role="status">Editorial permission could not be confirmed. Your draft is kept.</p>}
        <label className="block space-y-2">Title<Input aria-label="Title" className="bg-dark-navy border-light-navy text-foreground" value={title} maxLength={200} disabled={locked} onChange={e => onChange({ title: e.target.value })} /></label>
        <label className="block space-y-2">Description<Textarea aria-label="Description" className="bg-dark-navy border-light-navy text-foreground" value={subtext} maxLength={2000} disabled={locked} onChange={e => onChange({ subtext: e.target.value })} /></label>
        <div className="space-y-2"><p>Pop-up Text</p><RichArticleEditor initialDocument={initialDocument} disabled={locked} onChange={contentDocument => onChange({ contentDocument })} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['titleColor', 'subtextColor'] as const).map((key, i) => {
            const original = i === 0 ? entry?.title_color : entry?.subtext_color;
            const value = (has(key) ? patch[key] : original) ?? '';
            const defaultColor = 'hsl(var(--foreground))';
            return <label key={key} className="block space-y-2">{i === 0 ? 'Title Color' : 'Description Color'}
              <span className="relative block w-12 h-10 rounded border border-light-navy" style={{ backgroundColor: value || defaultColor }}>
                <input type="color" aria-label={i === 0 ? 'Choose title color' : 'Choose description color'} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#FFFFFF'} disabled={locked}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => onChange({ [key]: e.target.value })} />
              </span>
              <Input aria-label={i === 0 ? 'Title Color' : 'Description Color'} value={value} placeholder="Theme default" disabled={locked} className="bg-dark-navy text-foreground" onChange={e => onChange({ [key]: e.target.value })} />
              {value && <Button type="button" variant="outline" className="text-foreground" disabled={locked} aria-label={i === 0 ? 'Use theme default title color' : 'Use theme default description color'} onClick={() => onChange({ [key]: null })}>Use theme default</Button>}
            </label>;
          })}
        </div>
        <label className="flex items-center gap-3"><input type="checkbox" checked={(has('highlightEffect') ? patch.highlightEffect : entry?.highlight_effect) ?? false} disabled={locked} onChange={e => onChange({ highlightEffect: e.target.checked })} />Highlight Effect</label>
        <div className="space-y-3">
          <label className="block">Background Image<input aria-label="Background Image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={locked || readingImage}
            onChange={e => { void imageInput(e.target.files?.[0]); e.target.value = ''; }} className="block mt-2" /></label>
          <p className="text-sm">PNG, JPEG, GIF or WebP, up to 5 MB. Available browser storage may require a smaller image.</p>
          {readingImage && <p role="status">Reading image...</p>}
          {imageUrl && <>
            <div ref={previewRef} className="relative h-48 rounded overflow-hidden"><ImageFocalPointControl imagePreview={imageUrl} position={{ x, y }} opacity={opacity} isDragging={dragging}
              onMouseDown={event => { if (!locked) { event.preventDefault(); setDragging(true); positionFromPointer(event.clientX, event.clientY); } }}
              onTouchStart={event => { if (!locked && event.touches[0]) { setDragging(true); positionFromPointer(event.touches[0].clientX, event.touches[0].clientY); } }} /></div>
            <Button type="button" variant="secondary" disabled={locked || readingImage} onClick={() => onChange({ image: { op: 'remove' } })}>Remove Image</Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([['focalPointX', 'Horizontal focal point', x], ['focalPointY', 'Vertical focal point', y], ['opacity', 'Tile Image Opacity', opacity], ['popupOpacity', 'Popup Image Opacity', popupOpacity]] as const).map(([key, label, value]) =>
                <label key={key} className="block">{label} ({value}%)<input aria-label={label} type="range" min={0} max={100} step={1} value={value} disabled={locked} className="block w-full" onChange={e => onChange({ [key]: Number(e.target.value) })} /></label>)}
            </div>
          </>}
        </div>
        {canEdit && confirmDelete && <div role="group" aria-label="Confirm deletion" className="border border-red-500 rounded p-3 space-y-3">
          <p>This will permanently delete this entry from the shared library for everyone.</p>
          <Button type="button" variant="destructive" disabled={locked} onClick={() => void onSubmit('delete')}>Confirm delete</Button>
          <Button type="button" variant="outline" className="text-foreground" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep entry</Button>
        </div>}
        <DialogFooter className="pt-4 gap-2">
          {canEdit && draft.expectedRevision > 0 && !draft.intent && <Button type="button" variant="destructive" disabled={locked} onClick={() => setConfirmDelete(true)}>Delete</Button>}
          <Button type="button" variant="outline" className="text-foreground" onClick={onClose}>Cancel</Button>
          {(!draft.intent || draft.rejected) && <Button type="button" variant="outline" className="text-foreground" disabled={busy} onClick={onDiscard}>Discard draft</Button>}
          <Button type="submit" disabled={busy || (!canEdit && !draft.receipt) || readingImage || errorCode === 'ENTRY_REVISION_CONFLICT'}>
            {busy ? 'Saving...' : draft.receipt ? 'Refresh library' : draft.intent && !draft.rejected ? 'Retry saved request' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
