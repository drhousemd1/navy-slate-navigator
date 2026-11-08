import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PredefinedIconsGrid from '@/components/task-editor/PredefinedIconsGrid';

// This test exercises the real preset owner/dialog. The separate, unopened
// custom-gallery branch imports a backend client and is outside this path.
vi.mock('@/components/task-editor/CustomIconsModal', () => ({ default: () => null }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Editor({ onSelect, onSubmit }: { onSelect: (name: string) => void; onSubmit: () => void }) {
  const [selected, setSelected] = React.useState('Star');
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <PredefinedIconsGrid selectedIconName={selected} iconColor="#22C55E" onSelectIcon={name => { setSelected(name); onSelect(name); }} />
  </form>;
}

describe('actual shared preset dialog keyboard path', () => {
  it.each([['Enter', '{Enter}'], ['Space', ' ']])('%s selects a preset once, closes, and restores the opener without submitting the editor', async (_label, key) => {
    const onSelect = vi.fn(), onSubmit = vi.fn(), user = userEvent.setup();
    render(<Editor onSelect={onSelect} onSubmit={onSubmit} />);
    const opener = screen.getByRole('button', { name: 'Browse Presets' });
    await user.tab(); expect(document.activeElement).toBe(opener);
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Preset Icons' });
    const selected = within(dialog).getByRole('button', { name: 'Select Star icon' });
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    const target = within(dialog).getByRole('button', { name: 'Select CheckSquare icon' });
    await waitFor(() => expect(document.activeElement).toBe(target));
    expect(target.getAttribute('aria-pressed')).toBe('false');
    await user.keyboard(key);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('CheckSquare');
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Select CheckSquare icon' }).getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Escape}');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
