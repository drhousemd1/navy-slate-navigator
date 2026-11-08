import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabasePublicKey: 'public', supabase: { auth: { getSession: vi.fn() }, storage: { from: vi.fn() } } }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'light-turquoise' }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/data/throne/images', () => ({ readThroneImage: vi.fn() }));
import { readThroneImage } from '@/data/throne/images';
import { supabase } from '@/integrations/supabase/client';
import ThroneRoomEditModal from '@/components/throne/ThroneRoomEditModal';
import ThroneRoomCard from '@/components/throne/ThroneRoomCard';
import CardBackground from '@/components/throne/card/CardBackground';
import { useImageCarousel } from '@/components/throne/hooks/useImageCarousel';
import { useCardData } from '@/components/throne/hooks/useCardData';
import { newThroneDefinition, type ThroneCard } from '@/data/throne/schema';
import { ThroneError, type ThroneTransport } from '@/data/throne/api';
import { emptyCounts, type ActivityMetrics } from '@/data/metrics/projection';
const owner = '10000000-0000-4000-8000-000000000001', id = '20000000-0000-4000-8000-000000000001';
const card = (): ThroneCard => ({ id, ownerId: owner, revision: 1, definition: { ...newThroneDefinition(), title: 'My progress', opacity: 0, focalX: 0, focalY: null, titleColor: '#22C55E', iconColor: null } });
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const image = { dataUrl: png, metadata: { originalSize: 100, compressedSize: atob(png.split(',')[1]).length, compressionRatio: 30, originalDimensions: { width: 1, height: 1 }, compressedDimensions: { width: 1, height: 1 }, timestamp: '2026-11-07T00:00:00.000Z' } };
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.mocked(readThroneImage).mockReset();
  vi.mocked(supabase.storage.from).mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const confirmedSave = () => vi.fn(async intent => ({ commandId: intent.commandId, cardId: intent.cardId, revision: intent.expectedRevision + 1, deleted: intent.kind === 'delete', replayed: false }));
describe('active personal card editor', () => {
  it('starts with the original empty icon selection and persists no implicit icon', async () => {
    const save = confirmedSave(); render(<ThroneRoomEditModal onSave={save} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Upload Icon' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Card title'), { target: { value: 'New card' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].definition).toMatchObject({ iconName: null, icon: null });
  });
  it('saves exact existing zeros/null/colors and holes without implicit defaults', async () => {
    const initial = card(); initial.definition.images = [null, image, null, null, image];
    const save = confirmedSave(), close = vi.fn();
    render(<ThroneRoomEditModal card={initial} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].definition).toEqual(initial.definition);
  });
  it('keeps a failed decode from replacing media/color or claiming save', async () => {
    const save = confirmedSave(); vi.mocked(readThroneImage).mockRejectedValue(new Error('bad decode'));
    render(<ThroneRoomEditModal card={card()} onSave={save} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Upload image to slot 1'), { target: { files: [new File(['bad'], 'bad.png', { type: 'image/png' })] } });
    await screen.findByRole('alert');
    expect((screen.getByLabelText('Title Color') as HTMLInputElement).value).toBe('#22C55E');
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].definition.images).toEqual([null, null, null, null, null]);
  });
  it('changes only the selected slot, retains opacity zero and saves focal slider endpoints', async () => {
    const save = confirmedSave(); vi.mocked(readThroneImage).mockResolvedValue(image);
    render(<ThroneRoomEditModal card={card()} onSave={save} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select background slot 4' }));
    fireEvent.change(screen.getByLabelText('Upload image to slot 4'), { target: { files: [new File(['png'], 'image.png', { type: 'image/png' })] } });
    await screen.findByRole('button', { name: 'Remove image from slot 4' });
    const focalPoint = screen.getByRole('group', { name: 'Image focal point' });
    for (let index = 0; index < 5; index++) fireEvent.keyDown(focalPoint, { key: 'ArrowDown', shiftKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].definition).toMatchObject({ images: [null, null, null, image, null], opacity: 0, focalX: 0, focalY: 100 });
  });
  it('selects a native preset with keyboard, clearing a custom icon and preserving color', async () => {
    const initial = card(); initial.definition.icon = image; initial.definition.iconName = null;
    const save = confirmedSave(); render(<ThroneRoomEditModal card={initial} onSave={save} onClose={vi.fn()} />);
    const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Browse Presets' }));
    const star = screen.getByRole('button', { name: 'Select Star icon' }); star.focus(); await user.keyboard('{Enter}');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].definition).toMatchObject({ iconName: 'Star', icon: null, iconColor: null });
  });
  it('browses private card icons through the original dialog and keeps exact validated metadata', async () => {
    const existing = card(); existing.definition.icon = image; existing.definition.iconName = null;
    const save = confirmedSave(); render(<ThroneRoomEditModal card={card()} availableCards={[existing]} onSave={save} onClose={vi.fn()} />);
    const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Browse Custom' }));
    const library = screen.getByRole('dialog', { name: 'Custom Icons' });
    const icon = within(library).getByRole('button', { name: 'Custom icon' });
    icon.focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Custom Icons' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].definition).toMatchObject({ iconName: null, icon: image });
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(readThroneImage).not.toHaveBeenCalled();
  });
  it('locks an uncertain draft and retries the same ID, revision and payload without duplicate click sends', async () => {
    const save = confirmedSave().mockRejectedValueOnce(new ThroneError('SAVE_UNCONFIRMED'));
    render(<ThroneRoomEditModal card={card()} onSave={save} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
    await screen.findByRole('button', { name: 'Retry same change' });
    expect((screen.getByLabelText('Card title') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry same change' })); await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[0][0]).toBe(save.mock.calls[1][0]);
  });
  it('requires explicit delete confirmation and sends no fabricated definition', async () => {
    const save = confirmedSave(); render(<ThroneRoomEditModal card={card()} onSave={save} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Card' })); expect(save).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Card' })); await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ kind: 'delete', cardId: id, expectedRevision: 1, definition: null });
  });
  it('blocks stale revision edits while keeping the draft visible', async () => {
    const save = confirmedSave().mockRejectedValue(new ThroneError('CARD_REVISION_CONFLICT', true));
    render(<ThroneRoomEditModal card={card()} onSave={save} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByRole('alert');
    expect((screen.getByLabelText('Card title') as HTMLInputElement).value).toBe('My progress');
    expect((screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
describe('personal card data and real summaries', () => {
  it('ignores a prior account read arriving after an account switch', async () => {
    let old!: (cards: ThroneCard[]) => void;
    const transport = { read: vi.fn().mockImplementationOnce(() => new Promise(resolve => { old = resolve; })).mockResolvedValue([]), write: vi.fn() } as ThroneTransport;
    const view = renderHook(({ account }) => useCardData(account, transport), { initialProps: { account: owner } });
    view.rerender({ account: id }); await waitFor(() => expect(view.result.current.loading).toBe(false));
    await act(async () => old([card()])); expect(view.result.current.cards).toEqual([]);
  });
  it('keeps errors honest, then updates/removes only after confirmed receipts', async () => {
    const transport = { read: vi.fn().mockResolvedValue([card()]), write: confirmedSave().mockRejectedValueOnce(new ThroneError('SAVE_UNCONFIRMED')) };
    const view = renderHook(() => useCardData(owner, transport)); await waitFor(() => expect(view.result.current.loading).toBe(false));
    const intent = { commandId: id, cardId: id, expectedRevision: 1, kind: 'delete' as const, definition: null };
    await act(async () => { await expect(view.result.current.save(intent)).rejects.toThrow(); }); expect(view.result.current.cards).toHaveLength(1);
    await act(async () => { await view.result.current.save(intent); }); expect(view.result.current.cards).toEqual([]);
  });
  it('shows projected counts/dates and never turns unavailable data into zero points', () => {
    const metrics: ActivityMetrics = { mode: 'atomic', dataArray: [{ date: '2026-11-02', ...emptyCounts(), subTasksCompleted: 3 }], totals: { ...emptyCounts(), subTasksCompleted: 3 },
      ranges: [{ role: 'sub', timeZone: 'UTC', start: '2026-11-02', end: '2026-11-09' }], retainedLegacy: { task: 0, rule: 0, reward: 0, punishment: 0 }, unclassifiedLegacy: 0 };
    const view = render(<ThroneRoomCard card={card()} metrics={metrics} metricsLoading={false} metricsError={null} isMonthlyView={false} onEdit={vi.fn()} />);
    expect(screen.getByLabelText('3 recorded').textContent).toBe('3'); expect(screen.getByLabelText('2026-11-02: 3 recorded')).toBeTruthy(); expect(screen.queryByText(/points/i)).toBeNull();
    view.rerender(<ThroneRoomCard card={card()} metrics={metrics} metricsLoading={false} metricsError={new Error('bad')} isMonthlyView={false} onEdit={vi.fn()} />);
    expect(screen.queryByLabelText('3 recorded')).toBeNull(); expect(screen.queryByLabelText('0 recorded')).toBeNull(); expect(screen.getByRole('alert')).toBeTruthy();
  });
});
describe('card carousel lifecycle', () => {
  it('crossfades decoded images for two seconds, preserves focal/opacity settings and cancels pending work', () => {
    vi.useFakeTimers();
    const loads: { onload: (() => void) | null }[] = [];
    vi.stubGlobal('Image', class { onload: (() => void) | null = null; complete = false; naturalWidth = 0; src = ''; constructor() { loads.push(this); } });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
    const view = render(<CardBackground visibleImage="one" focalPointX={0} focalPointY={0} backgroundOpacity={35} />);
    view.rerender(<CardBackground visibleImage="two" focalPointX={0} focalPointY={0} backgroundOpacity={35} />);
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('one');
    act(() => loads[0].onload?.());
    expect(view.container.querySelectorAll('img')).toHaveLength(2);
    expect(view.container.querySelectorAll('img')[1].style.opacity).toBe('0');
    act(() => vi.advanceTimersByTime(32));
    expect(view.container.querySelectorAll('img')[1].style.opacity).toBe('0.35');
    expect(view.container.querySelectorAll('img')[1].style.objectPosition).toBe('0% 0%');
    act(() => vi.advanceTimersByTime(2000));
    expect(view.container.querySelectorAll('img')).toHaveLength(1);
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('two');
    view.rerender(<CardBackground visibleImage="three" />); act(() => loads[1].onload?.());
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
    const still = render(<CardBackground visibleImage="one" reducedMotion />);
    still.rerender(<CardBackground visibleImage="two" reducedMotion />);
    expect(still.container.querySelector('img')?.getAttribute('src')).toBe('two');
    expect(vi.getTimerCount()).toBe(0); expect(loads).toHaveLength(2);
  });
  it('starts after asynchronous images arrive, preserves hole order, pauses and cleans its timer', () => {
    vi.useFakeTimers(); const view = renderHook(({ images }) => useImageCarousel({ images }), { initialProps: { images: [null, null] as (string | null)[] } });
    expect(view.result.current.visibleImage).toBeNull(); view.rerender({ images: [null, 'one', null, 'two'] }); expect(view.result.current.visibleImage).toBe('one');
    act(() => vi.advanceTimersByTime(6000)); expect(view.result.current.visibleImage).toBe('two');
    act(() => view.result.current.setPaused(true)); act(() => vi.advanceTimersByTime(12000)); expect(view.result.current.visibleImage).toBe('two');
    act(() => view.result.current.next()); expect(view.result.current.visibleImage).toBe('one');
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('respects reduced-motion preference and changed images without hiding manual controls', () => {
    vi.useFakeTimers(); vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const view = renderHook(({ images }) => useImageCarousel({ images }), { initialProps: { images: ['one', 'two'] } });
    act(() => vi.advanceTimersByTime(18000)); expect(view.result.current.visibleImage).toBe('one'); expect(vi.getTimerCount()).toBe(0);
    act(() => view.result.current.next()); expect(view.result.current.visibleImage).toBe('two');
    view.rerender({ images: ['three', 'four'] }); expect(view.result.current.visibleImage).toBe('three');
  });
});
