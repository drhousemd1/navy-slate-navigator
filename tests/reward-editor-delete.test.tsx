import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RewardEditorForm from '@/components/reward-editor/RewardEditorForm';

vi.mock('@/contexts/RewardsContext', () => ({ useRewards: () => ({ atomicAccounting: true }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/components/reward-editor/RewardFormProvider', () => ({ default: ({ children }: any) => children({ watch: () => 50, setValue: vi.fn() }, vi.fn()) }));
vi.mock('@/components/reward-editor/RewardFormSubmitHandler', () => ({ default: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/reward-editor/RewardBasicDetails', () => ({ default: () => null }));
vi.mock('@/components/reward-editor/RewardIconSection', () => ({ default: () => null }));
vi.mock('@/components/reward-editor/RewardImageSection', () => ({ default: () => null }));
vi.mock('@/components/reward-editor/RewardColorSettings', () => ({ default: () => null }));
vi.mock('@/components/reward-editor/hooks/useRewardIcon', () => ({ useRewardIcon: () => ({ selectedIconName: null, setSelectedIconName: vi.fn(), setIconPreview: vi.fn() }) }));
vi.mock('@/components/reward-editor/hooks/useRewardBackground', () => ({ useRewardBackground: () => ({ imagePreview: null, setImagePreview: vi.fn() }) }));
afterEach(cleanup);
describe('editor deletion delegates to the queued page action', () => {
  it('calls the supplied delete handler once and describes unused-item refunds', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined), onCancel = vi.fn();
    render(<RewardEditorForm rewardData={{ id: 'reward', title: 'Quiet evening' } as any} onSave={vi.fn()} onCancel={onCancel} onDelete={onDelete} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/Unused purchases will be cancelled/)).toBeTruthy();
    await user.click(screen.getByRole('alertdialog').querySelector('button:last-child')!);
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('reward');
    expect(onCancel).toHaveBeenCalledOnce();
  });
  it('keeps a failed queue write visible rather than claiming deletion', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Action could not be saved; no deletion sent.')), onCancel = vi.fn();
    render(<RewardEditorForm rewardData={{ id: 'reward', title: 'Quiet evening' } as any} onSave={vi.fn()} onCancel={onCancel} onDelete={onDelete} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('alertdialog').querySelector('button:last-child')!);
    expect((await screen.findByRole('alert')).textContent).toContain('no deletion sent');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
