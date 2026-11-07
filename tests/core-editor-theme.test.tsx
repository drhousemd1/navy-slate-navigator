import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaskEditor from '@/components/TaskEditor';
import RuleEditor from '@/components/RuleEditor';
import RewardEditor from '@/components/RewardEditor';
import PunishmentEditor from '@/components/PunishmentEditor';
import type { Rule } from '@/data/interfaces/Rule';
import type { Reward } from '@/data/rewards/types';
import type { PunishmentData } from '@/contexts/punishments/types';
import { COLOR_SCHEMES, getColorScheme } from '@/lib/colorSchemes';

const mocks = vi.hoisted(() => ({ theme: 'light-turquoise', mobile: false, save: vi.fn(), remove: vi.fn(), close: vi.fn(), list: vi.fn() }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: mocks.theme }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mocks.mobile }));
vi.mock('@/hooks/useEditorDraftScope', () => ({ useEditorDraftScope: () => ({ backendId: 'local', accountId: 'fixture', relationshipId: 'period', relationshipSessionId: 'generation' }) }));
vi.mock('@/contexts/RewardsContext', () => ({ useRewards: () => ({ atomicAccounting: true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ list: mocks.list }) } }, supabaseBackendId: 'local' }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.scrollIntoView ??= () => {};

const image = 'data:image/png;base64,aW1hZ2U=';
const saved = { id: 'fixture-definition', title: 'Preserved title', description: 'Preserved description', priority: 'medium' as const,
  points: 7, dom_points: 3, cost: 8, dom_supply: 0, supply: 0, frequency: 'daily', frequency_count: 2,
  title_color: '#FFFFFF', subtext_color: '#8E9196', calendar_color: '#22C55E', icon_color: '#123456', icon_name: 'Heart',
  highlight_effect: true, background_image_url: image, background_opacity: 0, focal_point_x: 0, focal_point_y: 100,
  is_dom_task: false, is_dom_reward: false, mandatory: true, deadline_time: '08:00', deadline_date: null, deadline_weekday: null };
const kinds = ['task', 'rule', 'reward', 'punishment'] as const;
type Kind = typeof kinds[number];
function editor(kind: Kind) {
  const common = { isOpen: true, onClose: mocks.close, onSave: mocks.save, onDelete: mocks.remove };
  if (kind === 'task') return <TaskEditor {...common} atomicAccounting taskData={saved} />;
  if (kind === 'rule') return <RuleEditor {...common} preserveHistory ruleData={saved as unknown as Rule} />;
  if (kind === 'reward') return <RewardEditor {...common} rewardData={saved as unknown as Reward} />;
  return <PunishmentEditor {...common} preserveHistory punishmentData={saved as unknown as PunishmentData} />;
}
const titleLabel = (kind: Kind) => kind === 'rule' ? 'Rule Title' : kind === 'reward' ? 'Reward Title' : 'Title';
const palettes = ['light-turquoise', ...COLOR_SCHEMES.filter(s => s.name !== 'light-turquoise').map(s => s.name)];
const originalPalettes = JSON.stringify(COLOR_SCHEMES), originalSaved = JSON.stringify(saved);
beforeEach(() => {
  localStorage.clear(); mocks.theme = 'light-turquoise'; mocks.mobile = false;
  mocks.save.mockReset().mockResolvedValue(saved); mocks.remove.mockReset().mockResolvedValue(undefined); mocks.close.mockReset();
  mocks.list.mockReset().mockResolvedValue({ data: [], error: null });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup(); localStorage.clear(); vi.unstubAllGlobals();
  expect(JSON.stringify(COLOR_SCHEMES)).toBe(originalPalettes); expect(JSON.stringify(saved)).toBe(originalSaved);
});

describe.each(kinds)('actual %s editor theme', kind => {
  it.each([false, true])('keeps all five palettes readable in the real mobile=%s form and submits the same saved appearance', async mobile => {
    mocks.mobile = mobile;
    const view = render(editor(kind));
    await screen.findByRole('textbox', { name: titleLabel(kind) });
    for (const theme of palettes) {
      mocks.theme = theme; view.rerender(editor(kind));
      const expected = theme === 'light-turquoise' ? 'text-foreground' : 'text-white';
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: new RegExp(`Edit ${kind}`, 'i') }).classList.contains(expected)).toBe(true);
      expect(within(dialog).getByText(/Modify the existing/).classList.contains(theme === 'light-turquoise' ? 'text-foreground' : 'text-light-navy')).toBe(true);
      for (const label of [titleLabel(kind), 'Description', 'Title Color hex value', 'Subtext Color hex value', 'Icon Color hex value']) {
        expect(within(dialog).getByRole('textbox', { name: label }).classList.contains(expected)).toBe(true);
        expect(within(dialog).getByRole('textbox', { name: label }).classList.contains('placeholder:text-foreground')).toBe(theme === 'light-turquoise');
      }
      for (const label of ['Browse Presets', 'Browse Custom', 'Remove Image', 'Upload Icon', 'Remove Icon']) {
        expect(within(dialog).getByRole('button', { name: label }).classList.contains(expected)).toBe(true);
      }
      expect(within(dialog).getByText('Highlight Effect').classList.contains(expected)).toBe(true);
      expect(within(dialog).getByText(/Closing keeps your draft/).parentElement?.classList.contains(theme === 'light-turquoise' ? 'text-foreground' : 'text-gray-300')).toBe(true);
      expect((within(dialog).getByRole('textbox', { name: 'Title Color hex value' }) as HTMLInputElement).value).toBe('#FFFFFF');
      expect((within(dialog).getByRole('textbox', { name: 'Subtext Color hex value' }) as HTMLInputElement).value).toBe('#8E9196');
      expect(within(dialog).getByRole('switch', { name: 'Highlight Effect' }).getAttribute('aria-checked')).toBe('true');
      const preview = within(dialog).getByAltText('Background preview');
      expect(preview.getAttribute('src')).toBe(image); expect(preview.style.opacity).toBe('0'); expect(preview.style.objectPosition).toBe('0% 100%');
      expect(dialog.querySelector('svg[style*="color: rgb(18, 52, 86)"]')).not.toBeNull();
      expect(within(dialog).getByRole('button', { name: 'Cancel' }).classList.contains('text-white')).toBe(true);
      if (kind === 'task') {
        expect(within(dialog).getByRole('combobox', { name: 'Frequency' }).classList.contains(expected)).toBe(true);
        expect((within(dialog).getByLabelText('Due time each day') as HTMLInputElement).value).toBe('08:00');
      }
    }
    fireEvent.submit(screen.getByRole('textbox', { name: titleLabel(kind) }).closest('form')!);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ title: saved.title, description: saved.description,
      title_color: saved.title_color, subtext_color: saved.subtext_color, icon_color: saved.icon_color,
      highlight_effect: true, background_image_url: image, background_opacity: 0, focal_point_x: 0, focal_point_y: 100 });
  });

  it('keeps nested preset and delete dialog text readable while preserving icon color and confirmation behavior', async () => {
    render(editor(kind)); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Browse Presets' }));
    const preset = screen.getByRole('dialog', { name: 'Preset Icons' });
    expect(within(preset).getByRole('heading').classList.contains('text-foreground')).toBe(true);
    const choice = within(preset).getByRole('button', { name: 'Select Heart icon' });
    expect((choice.querySelector('svg') as SVGElement).style.color).toBe('rgb(18, 52, 86)');
    await user.click(choice);
    const removeName = kind === 'task' ? 'Delete Task' : kind === 'rule' ? 'Delete Rule' : 'Delete';
    await user.click(screen.getByRole('button', { name: removeName }));
    const confirm = screen.getByRole('alertdialog');
    expect(within(confirm).getByRole('heading').classList.contains('text-foreground')).toBe(true);
    const description = document.getElementById(confirm.getAttribute('aria-describedby')!);
    expect(description?.classList.contains('text-foreground')).toBe(true);
    expect(within(confirm).getByRole('button', { name: 'Cancel' }).classList.contains('text-foreground')).toBe(true);
    expect(within(confirm).getByRole('button', { name: 'Delete' }).classList.contains('text-white')).toBe(true);
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: titleLabel(kind) })).toBeTruthy();
  });
});

it('keeps custom icon loading/empty text readable on the light panel without starting an upload', async () => {
  render(editor('task'));
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Browse Custom' }));
  const dialog = screen.getByRole('dialog', { name: 'Custom Icons' });
  expect(within(dialog).getByRole('heading').classList.contains('text-foreground')).toBe(true);
  expect((await within(dialog).findByText('No custom icons uploaded yet.')).classList.contains('text-foreground')).toBe(true);
  expect(within(dialog).getByRole('button', { name: 'Upload New Icon' }).classList.contains('text-foreground')).toBe(true);
  expect(mocks.list).toHaveBeenCalledOnce(); expect(mocks.save).not.toHaveBeenCalled();
});

it.each(['task', 'reward', 'punishment'] as const)('keeps a %s save failure readable and preserves the open form', async kind => {
  mocks.save.mockRejectedValue(new Error('Changes were not confirmed'));
  render(editor(kind));
  fireEvent.submit((await screen.findByRole('textbox', { name: titleLabel(kind) })).closest('form')!);
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toBe('Changes were not confirmed'); expect(alert.classList.contains('text-foreground')).toBe(true);
  expect(mocks.close).not.toHaveBeenCalled(); expect(screen.getByRole('textbox', { name: titleLabel(kind) })).toBeTruthy();
});

it('uses a foreground color with sufficient contrast on the three light editor panel surfaces', () => {
  function luminance(hsl: string) {
    const [h, s, l] = hsl.split(' ').map(Number.parseFloat), a = s / 100 * Math.min(l / 100, 1 - l / 100);
    return [0, 8, 4].map(n => { const k = (n + h / 30) % 12, c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  }
  const palette = getColorScheme('light-turquoise')!.variables, text = luminance(palette['--foreground']);
  for (const surface of ['--navy', '--dark-navy', '--light-navy'] as const) {
    const background = luminance(palette[surface]);
    expect((Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
