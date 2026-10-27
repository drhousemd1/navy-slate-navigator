import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { EditorDraftNotice } from '@/components/common/EditorDraftNotice';
import { editorDraftKey, type EditorDraftScope } from '@/lib/editorDrafts';

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
const scope: EditorDraftScope = { backendId: 'local', accountId: 'alice', relationshipId: 'period', relationshipSessionId: '00000000-0000-4000-8000-000000000090' };
const defaults = { title: 'Server title', cost: 10, background_image_url: 'server.jpg' as string | null, icon_name: null as string | null, focal_point_x: 50, image_meta: null as unknown };
function Editor({ scope: owner = scope, id = 'reward-new' }: { scope?: EditorDraftScope; id?: string }) {
  const form = useForm({ defaultValues: defaults });
  const draft = useFormStatePersister(id, form, { scope: owner });
  const values = form.watch();
  return <><EditorDraftNotice draft={draft} /><input aria-label="Title" {...form.register('title')} />
    <output data-testid="values">{JSON.stringify(values)}</output>
    <button onClick={() => { form.setValue('cost', 0); form.setValue('focal_point_x', 0); form.setValue('background_image_url', 'data:image/png;base64,draft'); form.setValue('icon_name', 'custom:data:image/png;base64,icon'); form.setValue('image_meta', { compressedSize: 123 }); }}>Media and zero</button>
    <button onClick={() => form.setValue('background_image_url', null)}>Remove image</button>
    <button onClick={async () => { await draft.clearPersistedState(); form.reset(defaults); }}>Confirmed save</button>
    <button onClick={draft.clearPersistedState}>Discard</button></>;
}
const mount = (owner = scope, id = 'reward-new') => render(<StrictMode><Editor scope={owner} id={id} /></StrictMode>);
const values = () => JSON.parse(screen.getByTestId('values').textContent!);
const saved = (owner = scope, id = 'reward-new') => JSON.parse(localStorage.getItem(editorDraftKey(owner, id))!);
beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('durable scoped editor drafts', () => {
  it('flushes the final edit on unmount and restores media, metadata, and zero values under StrictMode', () => {
    const view = mount();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Last keystroke' } });
    fireEvent.click(screen.getByText('Media and zero'));
    view.unmount();
    expect(saved().values.title).toBe('Last keystroke');
    mount();
    expect(values()).toMatchObject({ title: 'Last keystroke', cost: 0, focal_point_x: 0, background_image_url: 'data:image/png;base64,draft', icon_name: 'custom:data:image/png;base64,icon', image_meta: { compressedSize: 123 } });
  });
  it('flushes on pagehide and restores an explicit image removal instead of the server image', () => {
    const view = mount(); fireEvent.click(screen.getByText('Remove image'));
    fireEvent(window, new Event('pagehide'));
    expect(saved().values.background_image_url).toBeNull(); view.unmount(); mount();
    expect(values().background_image_url).toBeNull();
  });
  it.each([
    ['backend', { ...scope, backendId: 'staging' }, 'reward-new'],
    ['account', { ...scope, accountId: 'bob' }, 'reward-new'],
    ['continued session', { ...scope, relationshipSessionId: '00000000-0000-4000-8000-000000000091' }, 'reward-new'],
    ['period', { ...scope, relationshipId: 'fresh-period' }, 'reward-new'],
    ['existing definition', scope, 'reward-existing'],
    ['feature', scope, 'task-new'],
  ])('does not hydrate another %s scope', (_label, owner, id) => {
    const view = mount(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Private draft' } }); view.unmount();
    mount(owner as EditorDraftScope, id as string);
    expect(values().title).toBe('Server title'); expect(saved().values.title).toBe('Private draft');
  });
  it('never reads a legacy global draft or uses an envelope stored under the wrong identity', () => {
    localStorage.setItem('kingdom-app-form-reward-new', JSON.stringify({ title: 'Unowned' }));
    localStorage.setItem(editorDraftKey(scope, 'reward-new'), JSON.stringify({ version: 2, key: editorDraftKey({ ...scope, accountId: 'bob' }, 'reward-new'), values: { title: 'Other account' } }));
    mount(); expect(values().title).toBe('Server title'); expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
  });
  it('preserves pre-generation scoped bytes without adopting them into a new session', () => {
    const oldKey = `obedience-editor-draft:v2:${JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, 'reward-new'])}`;
    const bytes = JSON.stringify({ version: 2, key: oldKey, values: { title: 'Before generation' } });
    localStorage.setItem(oldKey, bytes); mount();
    expect(values().title).toBe('Server title'); expect(localStorage.getItem(oldKey)).toBe(bytes);
  });
  it('clears only the confirmed draft and does not recreate it from reset or unmount', async () => {
    localStorage.setItem(editorDraftKey(scope, 'task-new'), 'untouched');
    const view = mount(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Confirmed' } });
    await act(async () => { fireEvent.click(screen.getByText('Confirmed save')); }); view.unmount();
    expect(localStorage.getItem(editorDraftKey(scope, 'reward-new'))).toBeNull();
    expect(localStorage.getItem(editorDraftKey(scope, 'task-new'))).toBe('untouched');
  });
  it('keeps edits in the form on quota failure, shows the failure and can retry the complete snapshot', () => {
    mount(); const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    fireEvent.click(screen.getByText('Media and zero')); fireEvent(window, new Event('pagehide'));
    expect(screen.getByRole('alert').textContent).toContain('could not be stored'); expect(values().cost).toBe(0);
    write.mockRestore(); fireEvent.click(screen.getByText('Retry draft storage'));
    expect(saved().values.background_image_url).toBe('data:image/png;base64,draft'); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('retries a failed exact-draft removal without clearing other scopes', () => {
    mount(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Stored' } }); fireEvent(window, new Event('pagehide'));
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
    fireEvent.click(screen.getByText('Discard')); expect(screen.getByRole('alert').textContent).toContain('could not be removed');
    remove.mockRestore(); fireEvent.click(screen.getByText('Retry draft storage'));
    expect(localStorage.getItem(editorDraftKey(scope, 'reward-new'))).toBeNull(); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('retries a temporary read failure before editing without deleting its saved draft', () => {
    localStorage.setItem(editorDraftKey(scope, 'reward-new'), JSON.stringify({ version: 2, key: editorDraftKey(scope, 'reward-new'), values: { title: 'Recover me' } }));
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    mount(); expect(screen.getByRole('alert')).toBeTruthy(); read.mockRestore(); fireEvent.click(screen.getByText('Retry draft storage'));
    expect(values().title).toBe('Recover me'); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('preserves unread bytes through new edits and flushes until explicitly discarded, then keeps the new input', () => {
    const key = editorDraftKey(scope, 'reward-new'); localStorage.setItem(key, 'corrupted saved bytes');
    mount(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New input' } });
    fireEvent(window, new Event('pagehide'));
    expect(localStorage.getItem(key)).toBe('corrupted saved bytes');
    fireEvent.click(screen.getByText('Retry draft storage'));
    expect(localStorage.getItem(key)).toBe('corrupted saved bytes'); expect(values().title).toBe('New input');
    fireEvent.click(screen.getByText('Discard unread saved draft'));
    expect(saved().values.title).toBe('New input'); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('after read recovery merges untouched saved fields without overwriting newer input', () => {
    const key = editorDraftKey(scope, 'reward-new');
    localStorage.setItem(key, JSON.stringify({ version: 2, key, values: { title: 'Old title', cost: 0 } }));
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    mount(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New title' } });
    read.mockRestore(); fireEvent.click(screen.getByText('Retry draft storage'));
    expect(values()).toMatchObject({ title: 'New title', cost: 0 });
    expect(saved().values).toMatchObject({ title: 'New title', cost: 0 });
  });
});
