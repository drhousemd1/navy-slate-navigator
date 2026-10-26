import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeletePunishmentDialog from '@/components/punishments/DeletePunishmentDialog';
import PunishmentFormSubmitHandler from '@/components/punishments/form/PunishmentFormSubmitHandler';
import { punishmentFormSchema } from '@/components/punishments/form/PunishmentFormProvider';
import DeleteRuleDialog from '@/components/rule-editor/DeleteRuleDialog';
vi.mock('@/hooks/useFormStatePersister', () => ({ useFormStatePersister: () => ({ clearPersistedState: vi.fn() }) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn() } }));
function SubmitButton({ isSaving }: { isSaving?: boolean }) { return <button type="submit" disabled={isSaving}>Save fixture</button>; }
afterEach(cleanup);
describe('recording editors retain data and await confirmation', () => {
  it('disables Rule removal controls while its existing async form handler is running', () => {
    const remove = vi.fn();
    render(<DeleteRuleDialog isOpen isDeleting preserveHistory onOpenChange={vi.fn()} onDelete={remove} ruleName="Fixture rule" />);
    expect(screen.getByText(/Past activity and Undo records/)).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Removing…' });expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);expect(remove).not.toHaveBeenCalled();
  });
  it('keeps a failed removal open with an actionable error', async () => {
    const close = vi.fn(); const remove = vi.fn().mockRejectedValue(new Error('Permission changed. Refresh before retrying.'));
    render(<DeletePunishmentDialog isOpen preserveHistory onOpenChange={close} onDelete={remove} punishmentName="Fixture" />);
    expect(screen.getByText(/Past activity, points and Undo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Permission changed');expect(close).not.toHaveBeenCalled();
  });
  it('does not close or accept a second deletion while the first is awaiting the server', async () => {
    let done!: () => void;const remove = vi.fn(() => new Promise<void>(resolve => { done = resolve; }));const close = vi.fn();
    render(<DeletePunishmentDialog isOpen onOpenChange={close} onDelete={remove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));expect(screen.getByRole('button', { name: 'Removing…' }).hasAttribute('disabled')).toBe(true);
    expect(close).not.toHaveBeenCalled();done();await waitFor(() => expect(close).toHaveBeenCalledWith(false));expect(remove).toHaveBeenCalledOnce();
  });
  it('saves zero points, zero visual values, a removed background and uploaded custom icon without losing the draft on failure', async () => {
    const values = punishmentFormSchema.parse({ title: 'Fixture', points: 0, dom_points: 0, background_opacity: 0, focal_point_x: 0, focal_point_y: 0, background_image_url: null });
    const save = vi.fn().mockRejectedValue(new Error('Save rejected'));const cancel = vi.fn();
    const form: any = { handleSubmit: (callback: any) => (e: Event) => { e.preventDefault();return callback(values); }, reset: vi.fn() };
    render(<PunishmentFormSubmitHandler form={form} selectedIconName={null} iconPreview="data:image/png;base64,fixture" imagePreview={null} onSave={save} onCancel={cancel}><SubmitButton /></PunishmentFormSubmitHandler>);
    fireEvent.click(screen.getByRole('button', { name: 'Save fixture' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Save rejected');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ points: 0, dom_points: 0, background_opacity: 0, focal_point_x: 0, focal_point_y: 0,
      background_image_url: null, icon_name: 'custom:data:image/png;base64,fixture' }));
    expect(cancel).not.toHaveBeenCalled();expect(form.reset).not.toHaveBeenCalled();
  });
});
