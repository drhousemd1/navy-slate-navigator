import { compressImage } from '@/utils/image/compression';
import { toast } from '@/hooks/use-toast';

export interface EditorDraftScope { backendId: string; accountId: string; relationshipId: string; relationshipSessionId: string }
// Earlier v2 bytes stay untouched. They cannot be assigned to a generation that
// was never recorded when they were written.
export const EDITOR_DRAFT_PREFIX = 'obedience-editor-draft:v3:';
export const editorDraftKey = (scope: EditorDraftScope, formId: string) =>
  `${EDITOR_DRAFT_PREFIX}${JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId, formId])}`;

/** Keep complete image data in the draft; object URLs cannot survive reload. */
export function readDraftImage(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The image could not be read.'));
    reader.onerror = reader.onabort = () => reject(new Error('The image could not be read. Please select it again.'));
    reader.readAsDataURL(file);
  });
}

export async function readBackgroundDraft(file: File) {
  const { blob, metadata } = await compressImage(file);
  return { url: await readDraftImage(blob), metadata };
}

export function reportDraftImageError() {
  toast({ title: 'Image could not be added', description: 'Your other changes are still here. Please select the image again and wait for its preview before closing.', variant: 'destructive' });
}

export function chooseDraftIcon(onSelected: (url: string) => void) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try { onSelected(await readDraftImage(file)); } catch { reportDraftImageError(); }
  };
  input.click();
}

// A processing image belongs to the mounted form session that selected it.
// Remounting the same definition or switching accounts invalidates old reads.
const activeForms = new WeakMap<object, object>();
export function registerDraftForm(form: object) {
  const token = {}; activeForms.set(form, token);
  return () => { if (activeForms.get(form) === token) activeForms.delete(form); };
}
export function captureDraftImageSession(form: object) {
  const token = activeForms.get(form);
  return (apply: () => void) => {
    if (token && activeForms.get(form) === token) apply();
    else toast({ title: 'Image was not added', description: 'The editor closed before the image finished processing. Reopen it and select the image again. Other saved draft changes remain.', variant: 'destructive' });
  };
}
