import type { EncyclopediaEntry, EncyclopediaIntent, EncyclopediaScope } from '@/types/encyclopedia';
export const backend = 'https://example.supabase.co';
export const scope: EncyclopediaScope = { backendId: backend, accountId: 'account-a' };
export const entryId = '10000000-0000-4000-8000-000000000001';
export const commandId = '20000000-0000-4000-8000-000000000001';
export const draftId = '30000000-0000-4000-8000-000000000001';
export const image = 'data:image/png;base64,iVBORw0KGgo=';
export const entry = (overrides: Partial<EncyclopediaEntry> = {}): EncyclopediaEntry => ({
  id: entryId, title: 'Reference article', subtext: 'Saved description', popup_text: 'Original **literal** text\\nsecond line',
  image_url: image, image_meta: { original: true }, focal_point_x: 0, focal_point_y: 0, opacity: 0, popup_opacity: 0,
  title_color: '#123456', subtext_color: '#456789', highlight_effect: false,
  popup_text_formatting: { isBold: false, isUnderlined: false, fontSize: '1rem' }, formatted_sections: [],
  revision: 4, contentDocument: null, ...overrides,
});
export const intent = (overrides: Partial<EncyclopediaIntent> = {}): EncyclopediaIntent => ({
  commandId, entryId, expectedRevision: 4, kind: 'save', patch: { title: 'Edited title' }, ...overrides,
});
export const receipt = (request = intent(), replayed = false) => ({ entryId: request.entryId, revision: request.expectedRevision + 1, deleted: request.kind === 'delete', replayed });
export function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
