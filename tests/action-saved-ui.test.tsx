import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedActions } from '@/components/activity/SavedActions';
import { command, deferred, scope, uuid } from './action-queue.helpers';
const mocks = vi.hoisted(() => ({ actions: {} as Record<string, unknown>, reconcile: vi.fn(), retry: vi.fn(), cancel: vi.fn() }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
const entry = () => ({ command, scope: { ...scope, relationshipSessionId: uuid(900) }, state: { status: 'pending' }, canReplay: false, canCancel: false, canReconcile: true });
beforeEach(() => { vi.resetAllMocks(); mocks.actions = { scope, mode: 'atomic', entries: [entry()], reconcile: mocks.reconcile, retry: mocks.retry, cancelUnsent: mocks.cancel }; });
afterEach(cleanup);
describe('saved-result controls remain scoped during asynchronous work', () => {
  it.each(['account', 'session'] as const)('enables the new %s’s check and suppresses old result/error after a switch', async kind => {
    const first = deferred<string>(); mocks.reconcile.mockReturnValueOnce(first.promise).mockResolvedValue('not_found');
    const view = render(<SavedActions />); fireEvent.click(screen.getByRole('button', { name: 'Check result' }));
    expect((screen.getByRole('button', { name: 'Checking result…' }) as HTMLButtonElement).disabled).toBe(true);
    const nextScope = { ...scope, ...(kind === 'account' ? { accountId: uuid(99) } : { relationshipSessionId: uuid(1001) }) };
    mocks.actions = { ...mocks.actions, scope: nextScope }; view.rerender(<SavedActions />);
    expect((screen.getByRole('button', { name: 'Check result' }) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => first.reject(new Error('OLD ACCOUNT ERROR')));
    expect(screen.queryByText('OLD ACCOUNT ERROR')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check result' }));
    await screen.findByText('No saved confirmation was found. This action remains saved and will not be sent again.');
    // Returning to the original scope cannot resurrect a stranded busy flag.
    mocks.actions = { ...mocks.actions, scope }; view.rerender(<SavedActions />);
    expect((screen.getByRole('button', { name: 'Check result' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it.each(['retry', 'cancel'] as const)('does not show a late %s failure in another connection', async operation => {
    const waiting = deferred<void>(); mocks[operation].mockReturnValue(waiting.promise);
    mocks.actions = { ...mocks.actions, entries: [{ ...entry(), scope, canReplay: true, canCancel: true, canReconcile: false }] };
    const view = render(<SavedActions />);
    fireEvent.click(screen.getByRole('button', { name: operation === 'retry' ? 'Retry same action' : 'Cancel unsent action' }));
    mocks.actions = { ...mocks.actions, scope: { ...scope, relationshipSessionId: uuid(1001) } }; view.rerender(<SavedActions />);
    await act(async () => waiting.reject(new Error('OLD RETRY FAILURE')));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('explains recovered completion without implying a new action or exposing technical receipt fields', async () => {
    mocks.reconcile.mockResolvedValue('confirmed'); render(<SavedActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Check result' }));
    await screen.findByText('This action was already completed. It has not been repeated.');
    expect(mocks.retry).not.toHaveBeenCalled(); expect(screen.queryByText(/relationshipSessionId|receipt|UUID/)).toBeNull();
  });
  it('shows an interrupted old send as unknown instead of claiming it is still sending', () => {
    mocks.actions = { ...mocks.actions, entries: [{ ...entry(), state: { status: 'sending' } }] };
    render(<SavedActions />);
    expect(screen.getByText(/Confirmation unknown; it may already be recorded/)).toBeTruthy();
    expect(screen.queryByText(/Checking and sending/)).toBeNull();
  });
});
