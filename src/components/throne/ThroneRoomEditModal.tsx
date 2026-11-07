import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import ImageFocalPointControl from '@/components/encyclopedia/image/ImageFocalPointControl';
import IconsDialog from '@/components/task-editor/icons/IconsDialog';
import { renderCardIcon } from './utils/renderCardIcon';
import { readThroneImage } from '@/data/throne/images';
import { ThroneError, throneErrorText } from '@/data/throne/api';
import { assertCardSize, newThroneDefinition, seriesLabels, validateDefinition, type ThroneCard, type ThroneDefinition, type ThroneIntent, type ThroneReceipt } from '@/data/throne/schema';

interface Props { card?: ThroneCard; onClose: () => void; onSave: (intent: ThroneIntent) => Promise<ThroneReceipt> }
// Mounted per editor session by PersonalThroneCards. Cancel never changes saved definitions.
export default function ThroneRoomEditModal({ card, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ThroneDefinition>(() => card?.definition ?? newThroneDefinition());
  const [cardId] = useState(() => card?.id ?? crypto.randomUUID());
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null); const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState<ThroneIntent | null>(null);
  const pendingRef = useRef<ThroneIntent | null>(null);
  const [readingImage, setReadingImage] = useState(false); const generation = useRef(0); const alive = useRef(true);
  const [slot, setSlot] = useState(0); const [presets, setPresets] = useState(false); const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [dragging, setDragging] = useState(false); const preview = useRef<HTMLDivElement>(null);
  useEffect(() => { const imageGeneration = generation; alive.current = true; return () => { alive.current = false; imageGeneration.current++; }; }, []);
  const locked = busy || !!pending || conflict || readingImage;
  const patch = (value: Partial<ThroneDefinition>) => { if (!locked) { setDraft(previous => ({ ...previous, ...value })); setError(null); } };
  const x = draft.focalX ?? 50, y = draft.focalY ?? 50, opacity = draft.opacity ?? 100;
  const positionFromPointer = (clientX: number, clientY: number) => {
    if (locked || !preview.current) return;
    const rect = preview.current.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    patch({ focalX: Math.round(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100))),
      focalY: Math.round(Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100))) });
  };
  useEffect(() => {
    if (!dragging || locked) return;
    const mouse = (e: MouseEvent) => positionFromPointer(e.clientX, e.clientY);
    const touch = (e: TouchEvent) => { if (e.touches[0]) { e.preventDefault(); positionFromPointer(e.touches[0].clientX, e.touches[0].clientY); } };
    const end = () => setDragging(false);
    document.addEventListener('mousemove', mouse); document.addEventListener('mouseup', end);
    document.addEventListener('touchmove', touch, { passive: false }); document.addEventListener('touchend', end);
    return () => { document.removeEventListener('mousemove', mouse); document.removeEventListener('mouseup', end); document.removeEventListener('touchmove', touch); document.removeEventListener('touchend', end); };
  });
  const loadImage = async (file: File | undefined, target: 'icon' | number) => {
    if (!file || locked) return;
    const token = ++generation.current; setReadingImage(true); setError(null);
    try {
      const image = await readThroneImage(file);
      if (token !== generation.current || !alive.current) return;
      const next = target === 'icon' ? { ...draft, icon: image, iconName: null } : { ...draft, images: draft.images.map((value, i) => i === target ? image : value) };
      assertCardSize(next); setDraft(next);
    } catch (reason) {
      if (token === generation.current && alive.current) setError(reason instanceof Error && reason.message === 'CARD_TOO_LARGE' ? throneErrorText(reason) : 'This image could not be added. Choose a readable image up to 12 MB (2 MB after compression). Your existing settings are unchanged.');
    } finally { if (token === generation.current && alive.current) setReadingImage(false); }
  };
  const submit = async (kind: 'save' | 'delete') => {
    if (busyRef.current || readingImage || conflict) return;
    let intent = pendingRef.current;
    if (!intent) {
      try { if (kind === 'save') validateDefinition(draft); }
      catch (reason) { setError(reason instanceof Error && reason.message === 'CARD_TOO_LARGE' ? throneErrorText(reason) : 'Check the title, colors and images before saving.'); return; }
      intent = { commandId: crypto.randomUUID(), cardId, expectedRevision: card?.revision ?? 0, kind, definition: kind === 'save' ? draft : null };
      pendingRef.current = intent; setPending(intent);
    }
    busyRef.current = true; setBusy(true); setError(null);
    try { await onSave(intent); if (alive.current) onClose(); }
    catch (reason) {
      if (!alive.current) return;
      setError(throneErrorText(reason));
      if (reason instanceof ThroneError && reason.definitive) {
        pendingRef.current = null; setPending(null);
        setConflict(['CARD_REVISION_CONFLICT', 'CARD_NOT_FOUND', 'ACCOUNT_CHANGED', 'ACCOUNT_UNAVAILABLE'].includes(reason.code));
      }
    } finally { busyRef.current = false; if (alive.current) setBusy(false); }
  };
  const inputClass = 'bg-dark-navy border-light-navy text-foreground';
  const submitForm = (e: FormEvent) => { e.preventDefault(); void submit('save'); };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="bg-navy border-light-navy text-foreground max-w-4xl" onPointerDownOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>{card ? 'Edit Throne Room Card' : 'Create Throne Room Card'}</DialogTitle></DialogHeader>
      <form className="space-y-5 mt-4" onSubmit={submitForm}>
        {error && <p role="alert" className="border border-red-500 rounded p-3">{error}</p>}
        <p className="text-sm">This card is private to your account. It summarizes recorded activity; it does not add points or actions.</p>
        <label className="block space-y-2">Card title<Input value={draft.title} disabled={locked} className={inputClass} maxLength={200} onChange={e => patch({ title: e.target.value })} /></label>
        <label className="block space-y-2">Card description<Textarea value={draft.description} disabled={locked} className={inputClass} maxLength={2000} onChange={e => patch({ description: e.target.value })} /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-2">Recorded activity<select className={`w-full rounded border p-2 ${inputClass}`} disabled={locked} value={draft.series} onChange={e => patch({ series: e.target.value as ThroneDefinition['series'] })}>
            {Object.entries(seriesLabels).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
          </select></label>
          <label className="block space-y-2">Priority<select className={`w-full rounded border p-2 ${inputClass}`} disabled={locked} value={draft.priority} onChange={e => patch({ priority: e.target.value as ThroneDefinition['priority'] })}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select></label>
        </div>
        <fieldset disabled={locked} className="space-y-3 border border-light-navy rounded p-4"><legend>Card icon</legend>
          <div className="flex gap-3 items-center"><span aria-hidden="true" className="w-10 h-10 flex items-center justify-center rounded-full bg-[#00f0ff]">{renderCardIcon({ iconUrl: draft.icon?.dataUrl, iconName: draft.iconName ?? undefined, iconColor: draft.iconColor ?? 'hsl(var(--foreground))' })}</span>
            <Button type="button" variant="secondary" onClick={() => setPresets(true)}>Browse Presets</Button>
            <Button type="button" variant="outline" onClick={() => patch({ icon: null, iconName: null })}>Remove icon</Button></div>
          <label className="block">Upload custom icon<input className="block mt-2 max-w-full" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={e => { void loadImage(e.target.files?.[0], 'icon'); e.target.value = ''; }} /></label>
        </fieldset>
        <fieldset disabled={locked} className="space-y-3 border border-light-navy rounded p-4"><legend>Background images</legend>
          <div className="grid grid-cols-5 gap-2">{draft.images.map((image, index) => <button type="button" key={index} aria-label={`Select background slot ${index + 1}`} aria-pressed={index === slot}
            className={`h-16 sm:h-24 border-2 rounded overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${index === slot ? 'border-nav-active' : 'border-light-navy'}`}
            onClick={() => setSlot(index)}>{image ? <img src={image.dataUrl} alt="" className="w-full h-full object-cover" /> : <span>{index + 1}</span>}</button>)}</div>
          <p className="text-sm">Select a slot to replace or remove it. Empty slots stay in place. Images rotate in slot order.</p>
          <label className="block">Upload image to slot {slot + 1}<input className="block mt-2 max-w-full" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={e => { void loadImage(e.target.files?.[0], slot); e.target.value = ''; }} /></label>
          <p className="text-sm">Up to 12 MB per input, compressed to PNG or JPEG (2 MB each; 6 MB per card). Animated images use their decoded still frame.</p>
          {readingImage && <p role="status">Processing image…</p>}
          {draft.images[slot] && <>
            <div ref={preview} className="relative h-48 rounded overflow-hidden"><ImageFocalPointControl imagePreview={draft.images[slot]!.dataUrl} position={{ x, y }} opacity={opacity} isDragging={dragging}
              onMouseDown={e => { if (!locked) { e.preventDefault(); setDragging(true); positionFromPointer(e.clientX, e.clientY); } }}
              onTouchStart={e => { if (!locked && e.touches[0]) { setDragging(true); positionFromPointer(e.touches[0].clientX, e.touches[0].clientY); } }} /></div>
            <Button type="button" variant="secondary" onClick={() => patch({ images: draft.images.map((image, index) => index === slot ? null : image) })}>Remove image from slot {slot + 1}</Button>
          </>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{([['focalX', 'Horizontal focal point', x], ['focalY', 'Vertical focal point', y], ['opacity', 'Image opacity', opacity]] as const).map(([key, label, value]) =>
            <div key={key}><label className="block">{label} ({value}%{draft[key] === null ? ', default' : ''})<Slider aria-label={label} min={0} max={100} step={1} value={[value]} disabled={locked} onValueChange={([next]) => patch({ [key]: next })} /></label>
              <Button type="button" variant="ghost" size="sm" onClick={() => patch({ [key]: null })} aria-label={`Use default ${label.toLowerCase()}`}>Use default</Button></div>)}</div>
        </fieldset>
        <fieldset disabled={locked} className="border border-light-navy rounded p-4"><legend>Color settings</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{([['titleColor', 'Title color'], ['descriptionColor', 'Description color'], ['iconColor', 'Icon color'], ['calendarColor', 'Calendar color']] as const).map(([key, label]) => <div key={key} className="space-y-2">
            <label className="block">{label}<Input className={inputClass} value={draft[key] ?? ''} placeholder="Default" maxLength={9} onChange={e => patch({ [key]: e.target.value })} /></label>
            <div className="flex items-center gap-2"><span className="relative block w-12 h-9 rounded border" style={{ backgroundColor: draft[key] ?? 'hsl(var(--foreground))' }}><input type="color" aria-label={`Choose ${label.toLowerCase()}`} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              value={/^#[a-f\d]{6}$/i.test(draft[key] ?? '') ? draft[key]! : '#ffffff'} onChange={e => patch({ [key]: e.target.value })} /></span>
              <Button type="button" variant="ghost" size="sm" aria-label={`Use default ${label.toLowerCase()}`} onClick={() => patch({ [key]: null })}>Use default</Button></div>
          </div>)}</div>
        </fieldset>
        <label className="flex items-center gap-3"><input type="checkbox" checked={draft.highlight} disabled={locked} onChange={e => patch({ highlight: e.target.checked })} />Highlight text</label>
        {deleteConfirmation && <div className="border border-red-500 p-3 rounded"><p>Delete this personal card? Recorded activities and points are kept.</p><Button type="button" variant="destructive" disabled={locked} onClick={() => void submit('delete')}>Confirm delete card</Button></div>}
        <DialogFooter className="gap-2">
          {card && !pending && <Button type="button" variant="destructive" disabled={locked} onClick={() => setDeleteConfirmation(!deleteConfirmation)}>Delete card</Button>}
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
          {pending && !busy ? <Button type="button" onClick={() => void submit(pending.kind)}>Retry same change</Button> : <Button type="submit" disabled={locked}>{busy ? 'Saving…' : 'Save card'}</Button>}
        </DialogFooter>
      </form>
      <IconsDialog isOpen={presets} onClose={() => setPresets(false)} selectedIconName={draft.iconName} iconColor={draft.iconColor ?? 'hsl(var(--foreground))'} onSelectIcon={iconName => patch({ iconName, icon: null })} />
    </DialogContent>
  </Dialog>;
}
