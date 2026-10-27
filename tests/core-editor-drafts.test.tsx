import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RewardEditorForm from '@/components/reward-editor/RewardEditorForm';
import PunishmentEditorForm from '@/components/punishments/PunishmentEditorForm';
import TaskEditorForm from '@/components/TaskEditorForm';
import RuleEditorForm from '@/components/rule-editor/RuleEditorForm';
import { toast } from '@/hooks/use-toast';
import { editorDraftKey } from '@/lib/editorDrafts';
const media = vi.hoisted(() => ({ compress: vi.fn() }));
vi.mock('@/utils/image/compression', () => ({ compressImage: (...args: unknown[]) => media.compress(...args) }));
const identity = vi.hoisted(() => ({ scope: { backendId: 'local', accountId: 'alice', relationshipId: 'period' } as any }));
vi.mock('@/hooks/useEditorDraftScope', () => ({ useEditorDraftScope: () => identity.scope }));
vi.mock('@/contexts/RewardsContext', () => ({ useRewards: () => ({ atomicAccounting: true }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
// Real providers, forms, submission handlers, and data bindings; replace media presentation only.
vi.mock('@/components/reward-editor/RewardImageSection', () => ({ default: Media }));
vi.mock('@/components/punishments/form/PunishmentImageSection', () => ({ default: Media }));
vi.mock('@/components/task-editor/TaskImageSection', () => ({ default: Media }));
vi.mock('@/components/task-editor/BackgroundImageSelector', () => ({ default: Media }));
vi.mock('@/components/reward-editor/RewardIconSection', () => ({ default: Icon }));
vi.mock('@/components/punishments/form/PunishmentIconSection', () => ({ default: Icon }));
vi.mock('@/components/task-editor/IconSelector', () => ({ default: Icon }));
vi.mock('@/components/task-editor/PredefinedIconsGrid', () => ({ default: () => null }));
function Media({ imagePreview, initialPosition, onRemoveImage, onImageUpload }: any) {
  return <><input aria-label="Select background file" type="file" onChange={onImageUpload} /><output data-testid="image">{imagePreview ?? 'none'}</output><output data-testid="focal">{JSON.stringify(initialPosition)}</output><button type="button" onClick={onRemoveImage}>Remove draft image</button></>;
}
function Icon({ iconPreview, onSelectIcon }: any) {
  return <><output data-testid="icon">{iconPreview ?? 'none'}</output><button type="button" onClick={() => onSelectIcon('custom:data:image/png;base64,selected')}>Select custom fixture</button></>;
}
const initial = { id: 'definition', title: 'Server title', description: '', points: 5, dom_points: 3, cost: 10, priority: 'high' as const, frequency: 'daily' as const, frequency_count: 2, background_image_url: 'server.jpg' };
const draftValues = { title: 'Recovered title', description: 'Recovered description', cost: 0, points: 0, dom_points: 0, dom_supply: 0,
  background_image_url: 'data:image/png;base64,background', icon_name: 'custom:data:image/png;base64,icon', icon_url: 'data:image/png;base64,icon',
  focal_point_x: 0, focal_point_y: 0, background_opacity: 0, image_meta: { compressedSize: 123 }, highlight_effect: true };
const variants = [
  ['reward', RewardEditorForm, 'rewardData', 'Reward Title'],
  ['punishment', PunishmentEditorForm, 'punishmentData', 'Title'],
  ['task', TaskEditorForm, 'taskData', 'Title'],
  ['rule', RuleEditorForm, 'ruleData', 'Rule Title'],
] as const;
function seed(kind: string) { const key = editorDraftKey(identity.scope, `${kind}-editor-definition`); localStorage.setItem(key, JSON.stringify({ version: 2, key, values: draftValues })); return key; }
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); localStorage.clear(); media.compress.mockReset(); identity.scope = { backendId: 'local', accountId: 'alice', relationshipId: 'period' }; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe.each(variants)('%s actual definition editor draft path', (kind, Editor, dataProp, label) => {
  it('restores media and zeros, retains a rejected save, survives close/reopen, and clears only after confirmed save', async () => {
    const key = seed(kind), cancel = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error('Permission denied; changes not saved')).mockImplementation(async values => ({ ...initial, ...values }));
    const element = <Editor {...{ [dataProp]: initial } as any} onSave={save} onCancel={cancel} />;
    const view = render(element);
    expect((screen.getByRole('textbox', { name: label }) as HTMLInputElement).value).toBe('Recovered title');
    expect(screen.getByTestId('image').textContent).toBe(draftValues.background_image_url);
    expect(screen.getByTestId('icon').textContent).toBe('data:image/png;base64,icon');
    expect(screen.getByTestId('focal').textContent).toBe('{"x":0,"y":0}');
    fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: 'Final edit before failure' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce()); await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy());
    expect(cancel).not.toHaveBeenCalled(); expect(localStorage.getItem(key)).not.toBeNull();
    view.unmount(); render(element);
    expect((screen.getByRole('textbox', { name: label }) as HTMLInputElement).value).toBe('Final edit before failure');
    expect(screen.getByTestId('image').textContent).toBe(draftValues.background_image_url);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2)); await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
    expect(save.mock.calls[1][0]).toMatchObject({ title: 'Final edit before failure', background_image_url: draftValues.background_image_url, focal_point_x: 0, focal_point_y: 0, background_opacity: 0, image_meta: draftValues.image_meta });
    // The real success handlers must preserve these values if a caller keeps the editor open.
    expect(screen.getByTestId('focal').textContent).toBe('{"x":0,"y":0}'); expect(screen.getByTestId('icon').textContent).toBe('data:image/png;base64,icon');
  });
  it('keeps explicit removals and custom icon changes in the payload; explicit Cancel discards only this draft', async () => {
    const key = seed(kind); const cancel = vi.fn(), save = vi.fn().mockRejectedValue(new Error('Offline'));
    localStorage.setItem(editorDraftKey({ ...identity.scope, accountId: 'bob' }, `${kind}-editor-definition`), 'untouched');
    render(<Editor {...{ [dataProp]: initial } as any} onSave={save} onCancel={cancel} />);
    fireEvent.click(screen.getByText('Remove draft image')); fireEvent.click(screen.getByText('Select custom fixture'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce()); await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy());
    expect(save.mock.calls[0][0].background_image_url ?? null).toBeNull();
    expect(save.mock.calls[0][0][kind === 'task' || kind === 'rule' ? 'icon_url' : 'icon_name']).toBe(kind === 'task' || kind === 'rule' ? 'data:image/png;base64,selected' : 'custom:data:image/png;base64,selected');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); await waitFor(() => expect(cancel).toHaveBeenCalledOnce());
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(editorDraftKey({ ...identity.scope, accountId: 'bob' }, `${kind}-editor-definition`))).toBe('untouched');
  });
  it('remounts its form on account/period changes rather than writing the previous account’s state', () => {
    const key = seed(kind); const element = <Editor {...{ [dataProp]: initial } as any} onSave={vi.fn()} onCancel={vi.fn()} />;
    const view = render(element); fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: 'Alice last edit' } });
    identity.scope = { ...identity.scope, accountId: 'bob', relationshipId: 'other-period' }; view.rerender(element);
    // Recreate element so React observes the external identity test seam.
    view.rerender(<Editor {...{ [dataProp]: initial } as any} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByRole('textbox', { name: label }) as HTMLInputElement).value).toBe('Server title');
    expect(JSON.parse(localStorage.getItem(key)!).values.title).toBe('Alice last edit');
    expect(localStorage.getItem(editorDraftKey(identity.scope, `${kind}-editor-definition`))).toBeNull();
  });
  it('rejects an image still processing after its editor closes or changes account', async () => {
    let finish!: (value: unknown) => void;
    media.compress.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<Editor {...{ [dataProp]: initial } as any} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Select background file'), { target: { files: [new File(['image'], 'image.png', { type: 'image/png' })] } });
    view.unmount(); identity.scope = { ...identity.scope, accountId: 'bob' };
    render(<Editor {...{ [dataProp]: initial } as any} onSave={vi.fn()} onCancel={vi.fn()} />);
    finish({ blob: new Blob(['processed'], { type: 'image/png' }), metadata: { compressedSize: 9 } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Image was not added' })));
    expect(screen.getByTestId('image').textContent).toBe('server.jpg');
    expect(localStorage.getItem(editorDraftKey(identity.scope, `${kind}-editor-definition`))).toBeNull();
  });

});
