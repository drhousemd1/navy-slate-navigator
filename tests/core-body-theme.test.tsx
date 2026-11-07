import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useActionCommands } from '@/contexts/ActionCommandsContext';
import type { useUserIds } from '@/contexts/UserIdsContext';
import type { useRecordingData } from '@/data/recordings/useRecordingData';
import type { useRetainedActivity } from '@/data/activityArchive/useRetainedActivity';
import type { Rule } from '@/data/interfaces/Rule';
import type { Reward } from '@/data/rewards/types';
import type { TaskActionData } from '@/data/tasks/actionReadModel';
import type { RecordingData } from '@/data/recordings/readModel';
import type { TaskProgress } from '@/domain/actions/types';
import { archiveRow, retainedPeriod } from './activity-archive.helpers';
import { command, scope } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({
  theme: 'light-turquoise', actions: {} as ReturnType<typeof useActionCommands>,
  identity: {} as ReturnType<typeof useUserIds>, recording: {} as ReturnType<typeof useRecordingData>,
  archive: {} as ReturnType<typeof useRetainedActivity>, useReward: vi.fn(), giftReward: vi.fn(), rpc: vi.fn(),
}));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: mocks.theme }) }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/data/activityArchive/useRetainedActivity', () => ({ useRetainedActivity: () => mocks.archive }));
vi.mock('@/data/recordings/useRecordingData', () => ({ useRecordingData: () => mocks.recording }));
vi.mock('@/contexts/RewardsContext', () => ({ useRewards: () => ({ handleUseReward: mocks.useReward, handleGiftReward: mocks.giftReward }) }));
vi.mock('@/data/rewards/queries/useRewardUsageQuery', () => ({ useRewardUsageQuery: () => ({ data: Array(7).fill(false) }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc }, supabaseBackendId: 'theme-test' }));
vi.mock('@/components/common/PointsBubbles', () => ({ default: () => null }));
vi.mock('@/components/PunishmentEditor', () => ({ default: () => null }));
vi.mock('@/components/RuleEditor', () => ({ default: () => null }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <main>{children}</main> }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn() } }));

import TasksHeader from '@/components/task/TasksHeader';
import RulesHeader from '@/components/rule/RulesHeader';
import RewardsHeader from '@/components/rewards/RewardsHeader';
import PunishmentsHeader from '@/components/punishments/PunishmentsHeader';
import { StandardLoading, StandardEmpty, StandardError } from '@/components/common/StandardizedStates';
import { TaskActivity } from '@/components/task/TaskActivity';
import { RewardActivity } from '@/components/rewards/RewardActivity';
import { RecordingActivity } from '@/components/recordings/RecordingActivity';
import TaskCard from '@/components/TaskCard';
import RuleCard from '@/components/rule/RuleCard';
import { AtomicPunishmentsContent } from '@/components/punishments/AtomicPunishmentsContent';
import { AtomicRulesContent } from '@/components/rule/AtomicRulesContent';
import RulesPage from '@/pages/Rules';
import PunishmentsPage from '@/pages/Punishments';
import RewardCard from '@/components/RewardCard';
import { COLOR_SCHEMES, getColorScheme } from '@/lib/colorSchemes';
import { customTextBacking } from '@/lib/customTextContrast';

const definition = { id: 'theme-card', title: 'Saved title', description: 'Saved description', points: 10, dom_points: 4, dom_supply: 0,
  priority: 'medium', title_color: '#FFFFFF', subtext_color: '#8E9196', calendar_color: '#22C55E', icon_color: '#22C55E',
  highlight_effect: false, background_opacity: 0, focal_point_x: 0, focal_point_y: 100, usage_data: [0,0,0,0,0,0,0], created_at: '2026-01-01' };
const taskData = (): TaskActionData => ({ tasks: [], events: [], points: [], imported: [], progress: {}, progressErrors: {} });
const recordingData = (): RecordingData => ({ definitions: [], events: [], points: [], imported: [], progress: [] });
const palettesBefore = JSON.stringify(COLOR_SCHEMES);

beforeEach(() => {
  mocks.theme = 'light-turquoise'; mocks.useReward.mockReset().mockResolvedValue(undefined); mocks.giftReward.mockReset().mockResolvedValue(undefined);
  mocks.identity = { currentRole: 'dom', participantId: 'dom', permissions: { definition_manage: 'both', sub_reward_redeem: 'both' } } as ReturnType<typeof useUserIds>;
  mocks.actions = { scope, mode: 'atomic', entries: [], confirmed: [], error: null, enqueue: vi.fn(),
    data: { rewards: [], lots: [], wallets: [], events: [], points: [], deliveries: [], acknowledged: [], importedUsage: [] },
  } as unknown as ReturnType<typeof useActionCommands>;
  mocks.archive = { available: true, periods: [retainedPeriod], selected: null, rows: null, loading: false, periodsLoading: false,
    select: vi.fn(), periodsError: null, error: null,
  } as unknown as ReturnType<typeof useRetainedActivity>;
  mocks.recording = { data: recordingData(), canManage: true, actions: mocks.actions, identity: mocks.identity, refresh: vi.fn() } as unknown as ReturnType<typeof useRecordingData>;
});
afterEach(() => { cleanup(); expect(JSON.stringify(COLOR_SCHEMES)).toBe(palettesBefore); expect(mocks.rpc).not.toHaveBeenCalled(); });

// Independent contrast calculation for the exact palette/backing colors used by the rendered components.
function rgb(hsl: string) {
  const [h, s, l] = hsl.split(' ').map(Number.parseFloat);
  const a = s / 100 * Math.min(l / 100, 1 - l / 100);
  return [0, 8, 4].map(n => { const k = (n + h / 30) % 12; return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); });
}
function contrast(a: number[], b: number[]) {
  const light = (v: number[]) => v.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const x = light(a), y = light(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

it.each(COLOR_SCHEMES.map(s => s.name))('keeps all four headings and shared states readable in %s without changing dark colors', name => {
  mocks.theme = name;
  const { container } = render(<><TasksHeader /><RulesHeader /><RewardsHeader /><PunishmentsHeader /><StandardLoading /><StandardError /><StandardEmpty /></>);
  const expected = name === 'light-turquoise' ? 'text-foreground' : 'text-white';
  for (const heading of screen.getAllByRole('heading')) expect(heading.classList.contains(expected)).toBe(true);
  expect(screen.getByText(/An error occurred/).classList.contains(expected)).toBe(true);
  expect(screen.getByText(/You do not have any cards/).classList.contains(expected)).toBe(true);
  expect(container.querySelector('svg')?.classList.contains(expected)).toBe(true);
  const palette = getColorScheme(name)!.variables;
  expect(contrast(name === 'light-turquoise' ? rgb(palette['--foreground']) : [1, 1, 1], rgb(palette['--dark-navy']))).toBeGreaterThanOrEqual(4.5);
});

it.each(['task', 'reward', 'rule', 'punishment'] as const)('keeps current and retained %s history, errors and saved-action controls readable in light', async domain => {
  const titles = { task: 'Task History', reward: 'Reward History', rule: 'Rule History', punishment: 'Punishment History' };
  mocks.actions.entries = [{ command, scope, state: { status: 'pending' }, canReplay: true, canCancel: true }] as ReturnType<typeof useActionCommands>['entries'];
  mocks.archive.periodsError = 'Saved period choices could not be refreshed.';
  const content = () => domain === 'task' ? <TaskActivity data={taskData()} /> : domain === 'reward' ? <RewardActivity /> : <RecordingActivity type={domain} data={recordingData()} refresh={vi.fn()} />;
  const view = render(content());
  await userEvent.setup().click(screen.getByText(titles[domain]));
  const select = await screen.findByLabelText('History period');
  expect(select.classList.contains('text-foreground')).toBe(true);
  expect(screen.getByText('Saved actions').parentElement?.classList.contains('text-foreground')).toBe(true);
  expect(screen.getByRole('button', { name: 'Retry same action' })).toBeTruthy();
  expect(screen.getByRole('alert').classList.contains('text-foreground')).toBe(true);
  expect(view.container.querySelector('.text-white, .text-gray-300, .text-amber-300')).toBeNull();
  mocks.archive.selected = retainedPeriod.periodId; mocks.archive.rows = [archiveRow()]; view.rerender(content());
  const archive = screen.getByRole('region', { name: 'Earlier activity history' });
  expect(within(archive).getByText('Recorded title: Recorded task title')).toBeTruthy();
  expect(within(archive).queryByRole('button', { name: /Undo/ })).toBeNull();
  expect(archive.querySelector('.text-white, .text-gray-300, .text-amber-300')).toBeNull();
});

it.each([['Rules', RulesPage], ['Punishments', PunishmentsPage]] as const)('keeps the %s connection gate readable while loading and retrying an error', async (_name, Page) => {
  mocks.actions.mode = 'loading'; mocks.actions.refresh = vi.fn().mockResolvedValue(undefined);
  const view = render(<Page />);
  expect(screen.getByRole('status').classList.contains('text-foreground')).toBe(true);
  mocks.actions.mode = 'error'; mocks.actions.error = 'Connection unavailable'; view.rerender(<Page />);
  expect(screen.getByRole('alert').classList.contains('text-foreground')).toBe(true);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect(mocks.actions.refresh).toHaveBeenCalledOnce();
});

it.each(['rule', 'punishment'] as const)('keeps %s loading, empty and permission explanations readable', kind => {
  mocks.recording.data = undefined; mocks.recording.isLoading = true;
  mocks.recording.actionReason = 'Link a Sub partner before recording this action.';
  const content = () => kind === 'rule' ? <AtomicRulesContent /> : <AtomicPunishmentsContent contentRef={{ current: {} }} />;
  const view = render(content());
  expect(screen.getByRole('status').classList.contains('text-foreground')).toBe(true);
  expect(screen.getByText(/Link a Sub partner/).classList.contains('text-foreground')).toBe(true);
  mocks.recording.data = recordingData(); mocks.recording.isLoading = false; view.rerender(content());
  expect(screen.getByText(/No .* yet. Use Add/).classList.contains('text-foreground')).toBe(true);
});

it.each(['rule', 'punishment'] as const)('keeps actual %s recording and Undo confirmations readable across all palettes', kind => {
  const receipt = { feedback: [{ subjectTitle: 'Recorded definition' }], pointDeltas: [{ participantId: 'sub', currency: 'sub', amount: -3 }], recordingProgress: { subjectType: kind } };
  mocks.actions.confirmed = [{ command: { kind: kind === 'rule' ? 'rule_violation' : 'punishment_apply' }, state: { status: 'confirmed', receipt } }] as ReturnType<typeof useActionCommands>['confirmed'];
  const content = () => <RecordingActivity type={kind} data={recordingData()} refresh={vi.fn()} />;
  const view = render(content());
  for (const theme of COLOR_SCHEMES) {
    mocks.theme = theme.name; view.rerender(content());
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Recorded definition'); expect(status.textContent).toContain('Sub: -3 points');
    expect(status.closest('section')?.classList.contains(theme.name === 'light-turquoise' ? 'text-foreground' : 'text-white')).toBe(true);
  }
  mocks.theme = 'light-turquoise';
  mocks.actions.confirmed = [{ command: { kind: 'undo', eventId: 'original' }, state: { status: 'confirmed', receipt } }] as ReturnType<typeof useActionCommands>['confirmed'];
  view.rerender(content());
  expect(screen.getByRole('status').textContent).toContain('Undo confirmed');
  expect(screen.getByRole('status').closest('section')?.classList.contains('text-foreground')).toBe(true);
  expect(mocks.actions.enqueue).not.toHaveBeenCalled();
});

it('gives image-free task progress and errors light foreground without recoloring text over a saved photo', () => {
  const progress = { frequency: 'daily', target: 2, currentCount: 0, usageData: [0,0,0,0,0,0,0],
    localDate: '2026-10-25', timeZone: 'America/Boise' } as TaskProgress;
  const content = (backgroundImage?: string, backgroundOpacity?: number) => <TaskCard {...definition} atomic progress={progress} progressError="Progress unavailable" backgroundImage={backgroundImage} backgroundOpacity={backgroundOpacity} />;
  const view = render(content());
  expect(screen.getByText('Today · America/Boise').classList.contains('text-foreground')).toBe(true);
  expect(screen.getByText('Progress unavailable').classList.contains('text-foreground')).toBe(true);
  view.rerender(content('data:image/png;base64,aW1hZ2U='));
  expect(screen.getByText('Today · America/Boise').classList.contains('text-gray-300')).toBe(true);
  expect(screen.getByText('Progress unavailable').classList.contains('text-amber-300')).toBe(true);
  view.rerender(content('data:image/png;base64,aW1hZ2U=', 0));
  expect(screen.getByText('Today · America/Boise').classList.contains('text-foreground')).toBe(true);
  expect(screen.getByText('Progress unavailable').classList.contains('text-foreground')).toBe(true);
});

const kinds = ['task', 'rule', 'punishment'] as const;
type CardKind = typeof kinds[number];
function card(kind: CardKind, extra: Partial<typeof definition> & { background_image_url?: string } = {}) {
  const value = { ...definition, ...extra };
  if (kind === 'task') return <TaskCard {...value} backgroundImage={value.background_image_url} backgroundOpacity={value.background_opacity} focalPointX={value.focal_point_x} focalPointY={value.focal_point_y} />;
  if (kind === 'rule') return <RuleCard rule={value as unknown as Rule} onEditRule={vi.fn()} onRuleBroken={vi.fn()} />;
  mocks.recording.data = { ...recordingData(), definitions: [value] } as RecordingData;
  return <AtomicPunishmentsContent contentRef={{ current: {} }} />;
}
function textNode(text: string) { return screen.getByText(text) as HTMLElement; }
function hasBacking(element: HTMLElement) { return !!element.parentElement?.style.backgroundColor; }

describe.each(kinds)('actual %s card text', kind => {
  it('protects saved white and gray on the light surface, restores original dark rendering, and never changes input values', () => {
    const bytes = JSON.stringify(definition); const view = render(card(kind));
    expect(textNode('Saved title').style.color).toBe('rgb(255, 255, 255)');
    expect(textNode('Saved description').style.color).toBe('rgb(142, 145, 150)');
    expect(hasBacking(textNode('Saved title'))).toBe(true); expect(hasBacking(textNode('Saved description'))).toBe(true);
    for (const theme of COLOR_SCHEMES.filter(s => s.name !== 'light-turquoise')) {
      mocks.theme = theme.name; view.rerender(card(kind));
      expect(hasBacking(textNode('Saved title'))).toBe(false); expect(hasBacking(textNode('Saved description'))).toBe(false);
      expect(textNode('Saved title').style.color).toBe('rgb(255, 255, 255)');
    }
    expect(JSON.stringify(definition)).toBe(bytes);
  });
  it('preserves readable dark text, photo opacity/focal endpoints, and the exact saved highlighter', () => {
    const view = render(card(kind, { title_color: '#000000', subtext_color: '#123456' }));
    expect(hasBacking(textNode('Saved title'))).toBe(false); expect(textNode('Saved description').style.color).toBe('rgb(18, 52, 86)');
    view.rerender(card(kind, { background_image_url: 'data:image/png;base64,aW1hZ2U=', background_opacity: 60 }));
    expect(hasBacking(textNode('Saved title'))).toBe(false);
    const background = view.container.querySelector('[style*="background-image"]') as HTMLElement;
    expect(background.style.opacity).toBe('0.6'); expect(background.style.backgroundPosition).toBe('0% 100%');
    view.rerender(card(kind, { highlight_effect: true }));
    expect(textNode('Saved title').classList.contains('highlighter')).toBe(true);
    expect(textNode('Saved title').style.backgroundColor).toBe('rgba(245, 245, 209, 0.7)');
    expect(hasBacking(textNode('Saved title'))).toBe(false);
  });
  it('treats an exactly zero-opacity image as an image-free visible surface without removing its saved image settings', () => {
    const saved = { background_image_url: 'data:image/png;base64,aW1hZ2U=', background_opacity: 0, focal_point_x: 0, focal_point_y: 100 };
    const before = JSON.stringify(saved); const view = render(card(kind, saved));
    const background = view.container.querySelector('[style*="background-image"]') as HTMLElement;
    expect(background.style.opacity).toBe('0'); expect(background.style.backgroundPosition).toBe('0% 100%');
    expect(background.style.backgroundImage).toContain(saved.background_image_url);
    expect(hasBacking(textNode('Saved title'))).toBe(true); expect(hasBacking(textNode('Saved description'))).toBe(true);
    expect(textNode('Saved title').style.color).toBe('rgb(255, 255, 255)');
    expect(JSON.stringify(saved)).toBe(before);
    view.rerender(card(kind, { ...saved, background_opacity: 1 }));
    expect(hasBacking(textNode('Saved title'))).toBe(false);
  });
});

it('keeps Reward black and its saved colors, while Use/Gift use light foreground and the same handlers', async () => {
  const reward = { ...definition, cost: 7, supply: 1, is_dom_reward: false } as unknown as Reward;
  mocks.actions.data!.wallets = [{ participant_id: 'sub', relationship_id: scope.relationshipId, currency: 'sub', balance: 20 }];
  mocks.actions.data!.lots = [{ id: 'lot', relationship_id: scope.relationshipId, reward_id: reward.id, owner_participant_id: 'sub', currency: 'sub', status: 'available', acquisition_event_id: 'purchase', active_redemption_event_id: null }];
  const view = render(<RewardCard reward={reward} />);
  expect((view.container.firstElementChild as HTMLElement).style.backgroundColor).toBe('rgb(0, 0, 0)');
  expect(textNode('Saved title').style.color).toBe('rgb(255, 255, 255)'); expect(hasBacking(textNode('Saved title'))).toBe(false);
  const use = screen.getByRole('button', { name: 'Use Sub reward' }), gift = screen.getByRole('button', { name: /Gift to Sub/ });
  expect(use.classList.contains('text-foreground')).toBe(true); expect(gift.classList.contains('text-foreground')).toBe(true);
  await userEvent.setup().click(use); expect(mocks.useReward).toHaveBeenCalledExactlyOnceWith(reward.id, 'sub');
  await userEvent.setup().click(gift); expect(mocks.giftReward).toHaveBeenCalledExactlyOnceWith(reward.id);
  mocks.theme = 'default'; view.rerender(<RewardCard reward={reward} />);
  expect(use.classList.contains('text-white')).toBe(true); expect(gift.classList.contains('text-white')).toBe(true);
});

it.each(['--card', '--navy', '--dark-navy'] as const)('backs only eligible colors when it actually improves contrast on %s', surface => {
  const backing = (color: string, extra = {}) => customTextBacking({ color, schemeName: 'light-turquoise', hasImage: false, highlight: false, surface, ...extra });
  const originalNavy = getColorScheme('default')!.variables['--dark-navy'];
  for (const color of ['#FFF', '#FFFFFFFF', '#8E9196']) {
    expect(backing(color)).toBe(`hsl(${originalNavy})`);
    const channels = color === '#8E9196' ? [142, 145, 150].map(c => c / 255) : [1, 1, 1];
    expect(contrast(channels, rgb(getColorScheme('light-turquoise')!.variables[surface]))).toBeLessThan(4.5);
    expect(contrast(channels, rgb(originalNavy))).toBeGreaterThanOrEqual(4.5);
  }
  for (const color of ['#000', '#123456', '#FFF0', '#FFFFFF00', 'white']) expect(backing(color)).toBeUndefined();
  expect(backing('#FFF', { hasImage: true })).toBeUndefined(); expect(backing('#FFF', { highlight: true })).toBeUndefined();
});
