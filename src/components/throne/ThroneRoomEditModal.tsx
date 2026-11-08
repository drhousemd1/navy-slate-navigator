import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import ImageFocalPointControl from '@/components/encyclopedia/image/ImageFocalPointControl';
import IconsDialog from '@/components/task-editor/icons/IconsDialog';
import IconSelector from '@/components/task-editor/IconSelector';
import CustomIconsModal from '@/components/task-editor/CustomIconsModal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { renderCardIcon } from './utils/renderCardIcon';
import { readThroneImage } from '@/data/throne/images';
import { ThroneError, throneErrorText } from '@/data/throne/api';
import { assertCardSize, newThroneDefinition, seriesLabels, validateDefinition, type ThroneCard, type ThroneDefinition, type ThroneIntent, type ThroneReceipt, type ThroneImage } from '@/data/throne/schema';

interface Props { card?: ThroneCard; availableCards?: ThroneCard[]; onClose: () => void; onSave: (intent: ThroneIntent) => Promise<ThroneReceipt> }
// Mounted per editor session by PersonalThroneCards. Cancel never changes saved definitions.
export default function ThroneRoomEditModal({ card, availableCards = [], onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ThroneDefinition>(() => card?.definition ?? newThroneDefinition());
  const [cardId] = useState(() => card?.id ?? crypto.randomUUID());
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null); const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState<ThroneIntent | null>(null);
  const pendingRef = useRef<ThroneIntent | null>(null);
  const [readingImage, setReadingImage] = useState(false); const generation = useRef(0); const alive = useRef(true);
  const iconInput = useRef<HTMLInputElement>(null);
  const [customIconsOpen, setCustomIconsOpen] = useState(false);
  const [recentIcons, setRecentIcons] = useState<Array<{ name: string | null; image: ThroneImage | null }>>([]);
  const rememberIcon = (name: string | null, image: ThroneImage | null) => setRecentIcons(previous => [{ name, image }, ...previous.filter(value => image ? value.image?.dataUrl !== image.dataUrl : value.name !== name)].slice(0, 5));
  const customIcons = Array.from(new Map([...availableCards.map(value => value.definition.icon), draft.icon, ...recentIcons.map(value => value.image)].filter((image): image is ThroneImage => !!image).map(image => [image.dataUrl, image])).values());
  const selectIcon = (name: string | null, image: ThroneImage | null) => { if (locked) return; patch({ iconName: name, icon: image }); rememberIcon(name, image); setCustomIconsOpen(false); };
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
      if (target === 'icon') { rememberIcon(null, image); setCustomIconsOpen(false); }
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
  const inputClass = 'bg-dark-navy border-light-navy text-white';
  const colorDefaults = { titleColor: '#FFFFFF', descriptionColor: '#8E9196', calendarColor: '#7E69AB', iconColor: '#FFFFFF' };
  const submitForm = (e: FormEvent) => { e.preventDefault(); void submit('save'); };
  return <><Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="bg-navy border border-light-navy text-white max-w-3xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle className="text-xl">{card ? 'Edit Throne Room Card' : 'Create Throne Room Card'}</DialogTitle></DialogHeader>
      <form className="space-y-6" onSubmit={submitForm}>
        {error && <p role="alert" className="border border-red-500 rounded p-3">{error}</p>}
        <fieldset disabled={locked} className="space-y-4 min-w-0">
          <div className="space-y-2"><label htmlFor="throne-title" className="text-sm font-medium leading-none text-white">Title</label><Input disabled={locked} id="throne-title" aria-label="Card title" placeholder="Enter title" value={draft.title} className={inputClass} maxLength={200} onChange={e => patch({ title: e.target.value })} /></div>
          <div className="space-y-2"><label htmlFor="throne-description" className="text-sm font-medium leading-none text-white">Description</label><Textarea disabled={locked} id="throne-description" aria-label="Card description" placeholder="Enter description" value={draft.description} className={inputClass} maxLength={2000} onChange={e => patch({ description: e.target.value })} /></div>
          <div className="space-y-2"><label htmlFor="throne-priority" className="text-sm font-medium leading-none text-white">Priority</label><Select disabled={locked} value={draft.priority} onValueChange={priority => patch({ priority: priority as ThroneDefinition['priority'] })}>
            <SelectTrigger id="throne-priority" className={inputClass}><SelectValue placeholder="Select priority" /></SelectTrigger><SelectContent className={inputClass}>{(['low', 'medium', 'high'] as const).map(value => <SelectItem key={value} value={value} className="hover:bg-light-navy">{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent>
          </Select></div>
          <div className="space-y-2"><label htmlFor="throne-series" className="text-sm font-medium leading-none text-white">Recorded activity</label><Select disabled={locked} value={draft.series} onValueChange={series => patch({ series: series as ThroneDefinition['series'] })}>
            <SelectTrigger id="throne-series" className={inputClass}><SelectValue /></SelectTrigger><SelectContent className={inputClass}>{Object.entries(seriesLabels).map(([key, title]) => <SelectItem key={key} value={key} className="hover:bg-light-navy">{title}</SelectItem>)}</SelectContent>
          </Select></div>
          <div className="space-y-4">
            <label className="text-white text-lg font-medium">Background Image</label>
            <div className="flex flex-row items-end space-x-6 mb-4"><div className="flex space-x-2">{draft.images.map((image, index) => <button type="button" key={index} aria-label={`Select background slot ${index + 1}`} aria-pressed={index === slot}
              className={`w-12 h-12 rounded-md cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${index === slot ? 'border-[2px] border-[#FEF7CD] shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]' : 'bg-dark-navy border border-light-navy hover:border-white'}`}
              onClick={() => setSlot(index)}>{image && <img src={image.dataUrl} alt={`Image ${index + 1}`} className="w-full h-full object-cover rounded-md" />}</button>)}</div></div>
            <div className="space-y-4">
              {readingImage && <p role="status">Processing image…</p>}
              <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                {draft.images[slot] ? <div className="space-y-4">
                  <div ref={preview} role="group" aria-label="Image focal point" tabIndex={locked ? -1 : 0}
                    aria-description="Use arrow keys to position the image. Hold Shift for larger steps."
                    className="relative w-full h-48 rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active"
                    onKeyDown={event => { if (locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const step = event.shiftKey ? 10 : 1; patch(event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? { focalX: Math.max(0, Math.min(100, x + (event.key === 'ArrowRight' ? step : -step))) } : { focalY: Math.max(0, Math.min(100, y + (event.key === 'ArrowDown' ? step : -step))) }); }}>
                    <ImageFocalPointControl imagePreview={draft.images[slot]!.dataUrl} position={{ x, y }} opacity={opacity} isDragging={dragging}
                      onMouseDown={e => { if (!locked) { e.preventDefault(); setDragging(true); positionFromPointer(e.clientX, e.clientY); } }}
                      onTouchStart={e => { if (!locked && e.touches[0]) { setDragging(true); positionFromPointer(e.touches[0].clientX, e.touches[0].clientY); } }} />
                  </div>
                  <Button type="button" variant="secondary" className="bg-dark-navy text-white hover:bg-light-navy" aria-label={`Remove image from slot ${slot + 1}`} onClick={() => patch({ images: draft.images.map((image, index) => index === slot ? null : image) })}>Remove Image</Button>
                </div> : <div className="relative h-32 flex flex-col items-center justify-center"><Upload aria-hidden="true" className="h-10 w-10 text-white mb-2" /><p className="text-white">Click to upload or drag and drop</p>
                  <input aria-label={`Upload image to slot ${slot + 1}`} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={e => { void loadImage(e.target.files?.[0], slot); e.target.value = ''; }} />
                </div>}
              </div>
              {draft.images[slot] && <div className="space-y-2"><label htmlFor="throne-opacity" className="text-sm font-medium leading-none text-white">Image Opacity ({opacity}%)</label><Slider id="throne-opacity" aria-label="Image opacity" min={0} max={100} step={1} value={[opacity]} disabled={locked} onValueChange={([value]) => patch({ opacity: value })} /></div>}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-white text-lg font-medium">Card Icon</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center"><IconSelector selectedIconName={draft.iconName} iconPreview={draft.icon?.dataUrl} iconColor={draft.iconColor ?? '#FFFFFF'}
                onSelectIcon={name => selectIcon(name, null)} onUploadIcon={() => iconInput.current?.click()} onRemoveIcon={() => patch({ icon: null, iconName: null })} /></div>
              <div className="border-2 border-light-navy rounded-lg p-4 flex flex-col h-full">
                <div className="space-y-3 mb-4"><Button type="button" className="w-full bg-light-navy hover:bg-navy text-white" onClick={() => setPresets(true)}>Browse Presets</Button><Button type="button" className="w-full bg-light-navy hover:bg-navy text-white" onClick={() => setCustomIconsOpen(true)}>Browse Custom</Button></div>
                <div className="mt-2"><p className="text-white text-sm font-medium mb-2">Recently Used Icons</p><div className="grid grid-cols-5 gap-2">
                  {recentIcons.length ? recentIcons.map((icon, index) => <button type="button" key={index} title={icon.image ? 'Custom icon' : icon.name ?? 'Icon'} aria-label={icon.image ? 'Choose recent custom icon' : `Choose recent ${icon.name} icon`} className="w-full aspect-square rounded-md bg-dark-navy flex items-center justify-center cursor-pointer hover:bg-navy transition-colors"
                    onClick={() => selectIcon(icon.name, icon.image)}>{icon.image ? <img src={icon.image.dataUrl} alt="" className="h-6 w-6 object-contain" /> : renderCardIcon({ iconName: icon.name ?? undefined, iconColor: '#ff6b6b' })}</button>) : Array.from({ length: 5 }, (_, index) => <div key={index} className="w-full aspect-square rounded-md bg-dark-navy flex items-center justify-center" />)}
                </div></div>
              </div>
            </div>
          </div>
          <div className="space-y-4"><div className="text-white font-medium text-sm">Colors</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([['titleColor', 'Title Color'], ['descriptionColor', 'Description Color'], ['calendarColor', 'Calendar Color'], ['iconColor', 'Icon Color']] as const).map(([key, label]) => {
              const color = draft[key] ?? colorDefaults[key];
              return <div key={key} className="space-y-2"><label htmlFor={`throne-${key}`} className="text-sm font-medium leading-none text-white">{label}</label><div className="flex items-center gap-2">
                <input type="color" aria-label={`Choose ${label.toLowerCase()}`} className="w-12 h-10 rounded border border-light-navy cursor-pointer bg-transparent" style={{ backgroundColor: color, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }} value={/^#[a-f\d]{6}$/i.test(color) ? color : '#FFFFFF'} onChange={e => patch({ [key]: e.target.value })} />
                <Input id={`throne-${key}`} className={`${inputClass} flex-1 font-mono text-sm`} value={color} placeholder="#FFFFFF" maxLength={9} onChange={e => patch({ [key]: e.target.value || null })} />
              </div></div>;
            })}
          </div></div>
          <div className="flex flex-row items-center justify-between space-y-2"><div className="space-y-0.5"><label htmlFor="throne-highlight" className="text-sm font-medium leading-none text-white">Highlight Effect</label><p className="text-sm text-gray-400">Apply a highlight behind title and description</p></div><Switch id="throne-highlight" checked={draft.highlight} disabled={locked} onCheckedChange={highlight => patch({ highlight })} /></div>
        </fieldset>
        <DialogFooter className="flex justify-between items-center pt-4">
          {card && !pending && <Button type="button" variant="destructive" className="mr-auto" disabled={locked} onClick={() => setDeleteConfirmation(true)}><Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Delete Card</Button>}
          <div className="flex space-x-2"><Button type="button" variant="outline" className="bg-transparent border border-slate-600 text-white hover:bg-slate-800" disabled={busy} onClick={onClose}>Cancel</Button>
          {pending && !busy ? <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void submit(pending.kind)}>Retry same change</Button> : <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={locked}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}</Button>}</div>
        </DialogFooter>
      </form>
      <input ref={iconInput} aria-label="Upload custom icon" className="hidden" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={locked} onChange={e => { void loadImage(e.target.files?.[0], 'icon'); e.target.value = ''; }} />
      <IconsDialog isOpen={presets} onClose={() => setPresets(false)} selectedIconName={draft.iconName} iconColor={draft.iconColor ?? '#FFFFFF'} onSelectIcon={iconName => { selectIcon(iconName, null); setPresets(false); }} />
      <CustomIconsModal isOpen={customIconsOpen} onClose={() => setCustomIconsOpen(false)} iconColor={draft.iconColor ?? '#FFFFFF'}
        onSelectIcon={url => { const image = customIcons.find(value => value.dataUrl === url); if (image) selectIcon(null, image); }}
        library={{ icons: customIcons.map((image, index) => ({ id: `personal-${index}`, url: image.dataUrl, name: 'Custom icon', created_at: image.metadata.timestamp })),
          upload: async file => { await loadImage(file, 'icon'); setCustomIconsOpen(false); } }} />

    </DialogContent>
  </Dialog><AlertDialog open={deleteConfirmation} onOpenChange={open => { if (!busy) setDeleteConfirmation(open); }}><AlertDialogContent className="bg-navy border border-light-navy text-white"><AlertDialogHeader><AlertDialogTitle>Delete this card?</AlertDialogTitle><AlertDialogDescription>This will delete this personal card. Recorded activities and points are kept.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy} className="border-light-navy text-white hover:bg-light-navy">Cancel</AlertDialogCancel><AlertDialogAction disabled={locked} className="bg-red-700 hover:bg-red-800 text-white" onClick={event => { event.preventDefault(); setDeleteConfirmation(false); void submit('delete'); }}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : 'Delete Card'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
