import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'account-a' } as { id: string } | null, loading: false },
  sessionAccount: 'account-a' as string | null,
  getSession: vi.fn(), from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.getSession }, from: mocks.from } }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <>{children}</> }));

import { ColorSchemeProvider, useColorScheme } from '@/contexts/ColorSchemeContext';
import { ColorSchemeErrorBoundary } from '@/components/ColorSchemeErrorBoundary';
import ColorScheme from '@/pages/ColorScheme';
import { COLOR_SCHEMES, applyColorScheme, getColorScheme } from '@/lib/colorSchemes';

type Result = { data: { user_id: string; scheme_name: string } | null; error: { message: string } | null };
const row = (name: string, account = 'account-a'): Result => ({ data: { user_id: account, scheme_name: name }, error: null });
const failure: Result = { data: null, error: { message: 'private server details' } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const responses: Array<Promise<Result> | Result> = [];
const requests: Array<{
  select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>; abortSignal: ReturnType<typeof vi.fn>;
}> = [];
function mockRequest() {
  const result = responses.shift();
  if (!result) throw new Error('Unexpected theme request');
  const builder = {
    select: vi.fn(() => builder), eq: vi.fn(() => builder), upsert: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder), single: vi.fn(() => builder),
    setHeader: vi.fn(() => builder), abortSignal: vi.fn(() => builder),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
  requests.push(builder);
  return builder;
}
function Probe() {
  const value = useColorScheme();
  return <>
    <output data-testid="theme-state">{JSON.stringify({ current: value.currentScheme, loading: value.isLoading,
      saving: value.isSaving, pending: value.pendingScheme, error: value.error, canApply: value.canApply })}</output>
    <button onClick={() => void value.applyScheme('forest-green')}>Choose forest</button>
    <button onClick={() => void value.applyScheme('warm-sunset')}>Choose sunset</button>
    <button onClick={() => void value.applyScheme('not-a-theme')}>Choose invalid</button>
    <button onClick={() => void value.retry()}>Retry</button>
  </>;
}
const provider = () => <ColorSchemeProvider><Probe /></ColorSchemeProvider>;
const state = () => JSON.parse(screen.getByTestId('theme-state').textContent!);
const rootPalette = () => document.documentElement.style.getPropertyValue('--navy');
const palette = (name: string) => getColorScheme(name)!.variables['--navy'];
async function ready(name = 'default') {
  await waitFor(() => expect(state()).toMatchObject({ current: name, loading: false, saving: false, canApply: true }));
}

beforeEach(() => {
  responses.length = 0; requests.length = 0;
  mocks.auth = { user: { id: 'account-a' }, loading: false };
  mocks.sessionAccount = 'account-a';
  mocks.from.mockReset().mockImplementation(mockRequest);
  mocks.getSession.mockReset().mockImplementation(async () => ({ data: { session: mocks.sessionAccount
    ? { user: { id: mocks.sessionAccount }, access_token: 'test-token-' + mocks.sessionAccount } : null }, error: null }));
  localStorage.clear();
  document.documentElement.removeAttribute('style');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('personal theme provider', () => {
  it('loads only the authenticated account with a pinned token; absent preference uses navy', async () => {
    responses.push({ data: null, error: null });
    render(provider());
    await ready();
    expect(mocks.from).toHaveBeenCalledWith('user_color_schemes');
    expect(requests[0].select).toHaveBeenCalledWith('user_id, scheme_name');
    expect(requests[0].eq).toHaveBeenCalledWith('user_id', 'account-a');
    expect(requests[0].setHeader).toHaveBeenCalledWith('Authorization', 'Bearer test-token-account-a');
    expect(rootPalette()).toBe(palette('default'));
  });

  it('serializes rapid saves, confirms the returned row, and upserts on user_id', async () => {
    const save = deferred<Result>();
    responses.push(row('warm-sunset'), save.promise);
    render(provider()); await ready('warm-sunset');
    fireEvent.click(screen.getByText('Choose forest'));
    fireEvent.click(screen.getByText('Choose sunset'));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(state()).toMatchObject({ current: 'warm-sunset', pending: 'forest-green', saving: true });
    expect(rootPalette()).toBe(palette('warm-sunset'));
    expect(requests[1].upsert).toHaveBeenCalledWith({ user_id: 'account-a', scheme_name: 'forest-green' }, { onConflict: 'user_id' });
    await act(async () => save.resolve(row('forest-green')));
    await ready('forest-green');
    expect(rootPalette()).toBe(palette('forest-green'));
  });

  it('preserves failed choice and confirmed palette; retries the same choice and reloads persisted state', async () => {
    responses.push(row('modern-monochrome'), failure, row('forest-green'), row('forest-green'));
    const first = render(provider()); await ready('modern-monochrome');
    fireEvent.click(screen.getByText('Choose forest'));
    await waitFor(() => expect(state().error?.kind).toBe('save'));
    expect(state()).toMatchObject({ current: 'modern-monochrome', pending: 'forest-green', canApply: false });
    expect(rootPalette()).toBe(palette('modern-monochrome'));
    expect(screen.getByTestId('theme-state').textContent).not.toContain('private server details');
    fireEvent.click(screen.getByText('Choose sunset'));
    expect(requests).toHaveLength(2);
    fireEvent.click(screen.getByText('Retry')); await ready('forest-green');
    expect(requests[2].upsert.mock.calls[0]).toEqual(requests[1].upsert.mock.calls[0]);
    first.unmount(); render(provider()); await ready('forest-green');
  });

  it('exposes load failure and allows an explicit retry without replacing stored data', async () => {
    responses.push(failure, row('light-turquoise'));
    render(provider());
    await waitFor(() => expect(state().error?.kind).toBe('load'));
    expect(state().canApply).toBe(false);
    expect(rootPalette()).toBe(palette('default'));
    fireEvent.click(screen.getByText('Choose forest'));
    expect(requests).toHaveLength(1);
    fireEvent.click(screen.getByText('Retry')); await ready('light-turquoise');
  });

  it.each([row('not-a-theme'), row('forest-green', 'account-b')])('rejects an invalid or wrong-account read', async result => {
    responses.push(result); render(provider());
    await waitFor(() => expect(state().error?.kind).toBe('load'));
    expect(rootPalette()).toBe(palette('default'));
  });

  it.each([row('warm-sunset'), row('forest-green', 'account-b'), { data: null, error: null }])('does not claim a mismatched write as saved', async result => {
    responses.push(row('default'), result); render(provider()); await ready();
    fireEvent.click(screen.getByText('Choose forest'));
    await waitFor(() => expect(state().error?.kind).toBe('save'));
    expect(state().current).toBe('default');
  });

  it('rejects unknown choices before sending', async () => {
    responses.push(row('default')); render(provider()); await ready();
    fireEvent.click(screen.getByText('Choose invalid'));
    expect(requests).toHaveLength(1);
  });

  it('ignores and preserves unowned legacy storage while signed out or authentication is loading', async () => {
    localStorage.setItem('color-scheme', 'forest-green');
    mocks.auth = { user: null, loading: false }; mocks.sessionAccount = null;
    applyColorScheme(getColorScheme('warm-sunset')!);
    const view = render(provider());
    expect(rootPalette()).toBe(palette('default'));
    expect(state().canApply).toBe(false);
    mocks.auth = { user: { id: 'account-a' }, loading: true };
    view.rerender(provider());
    expect(state().loading).toBe(true);
    expect(rootPalette()).toBe(palette('default'));
    expect(localStorage.getItem('color-scheme')).toBe('forest-green');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('resets before paint on signout and does not adopt a late save', async () => {
    const save = deferred<Result>(); responses.push(row('warm-sunset'), save.promise);
    const view = render(provider()); await ready('warm-sunset');
    fireEvent.click(screen.getByText('Choose forest'));
    await waitFor(() => expect(requests).toHaveLength(2));
    mocks.auth = { user: null, loading: false }; mocks.sessionAccount = null;
    view.rerender(provider());
    expect(rootPalette()).toBe(palette('default'));
    expect(state()).toMatchObject({ current: 'default', pending: null, loading: false });
    expect(requests[1].abortSignal.mock.calls[0][0].aborted).toBe(true);
    await act(async () => save.resolve(row('forest-green')));
    expect(rootPalette()).toBe(palette('default'));
  });

  it('fences A -> B -> A reads and saves by request generation', async () => {
    const oldA = deferred<Result>(); const b = deferred<Result>();
    responses.push(row('warm-sunset'), oldA.promise, b.promise, row('light-turquoise'));
    const view = render(provider()); await ready('warm-sunset');
    fireEvent.click(screen.getByText('Choose forest'));
    await waitFor(() => expect(requests).toHaveLength(2));
    mocks.auth.user = { id: 'account-b' }; mocks.sessionAccount = 'account-b';
    view.rerender(provider()); expect(rootPalette()).toBe(palette('default'));
    await waitFor(() => expect(requests).toHaveLength(3));
    mocks.auth.user = { id: 'account-a' }; mocks.sessionAccount = 'account-a';
    view.rerender(provider()); await ready('light-turquoise');
    await act(async () => { oldA.resolve(row('forest-green')); b.resolve(row('forest-green', 'account-b')); });
    expect(state().current).toBe('light-turquoise');
    expect(rootPalette()).toBe(palette('light-turquoise'));
  });

  it('checks actual SDK account before send and again before accepting a response', async () => {
    mocks.sessionAccount = 'account-b'; render(provider());
    await waitFor(() => expect(state().error?.kind).toBe('load'));
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.sessionAccount = 'account-a';
    const load = deferred<Result>(); responses.push(load.promise);
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => expect(requests).toHaveLength(1));
    mocks.sessionAccount = 'account-b';
    await act(async () => load.resolve(row('forest-green')));
    await waitFor(() => expect(state().error?.kind).toBe('load'));
    expect(rootPalette()).toBe(palette('default'));
  });

  it('aborts on unmount and a late old response cannot recolor a newly mounted provider', async () => {
    const old = deferred<Result>(); responses.push(old.promise, row('forest-green', 'account-b'));
    const first = render(provider()); await waitFor(() => expect(requests).toHaveLength(1));
    first.unmount();
    mocks.auth.user = { id: 'account-b' }; mocks.sessionAccount = 'account-b';
    render(provider()); await ready('forest-green');
    await act(async () => old.resolve(row('warm-sunset')));
    expect(rootPalette()).toBe(palette('forest-green'));
  });

  it('handles StrictMode cleanup without blocking the live load', async () => {
    responses.push(row('forest-green'));
    render(<StrictMode>{provider()}</StrictMode>); await ready('forest-green');
    expect(requests).toHaveLength(1);
  });

  it('bounds a hung session read and does not send when it resolves after timeout', async () => {
    vi.useFakeTimers();
    const session = deferred<unknown>(); mocks.getSession.mockReturnValueOnce(session.promise);
    render(provider());
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(state().error?.kind).toBe('load');
    await act(async () => session.resolve({ data: { session: { user: { id: 'account-a' }, access_token: 'late' } }, error: null }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('keeps uncertain timed-out save retryable and rejects a late success', async () => {
    responses.push(row('warm-sunset')); render(provider()); await ready('warm-sunset');
    vi.useFakeTimers();
    const save = deferred<Result>(); responses.push(save.promise, row('forest-green'));
    fireEvent.click(screen.getByText('Choose forest'));
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(state()).toMatchObject({ current: 'warm-sunset', pending: 'forest-green', error: { kind: 'save' } });
    await act(async () => save.resolve(row('forest-green')));
    expect(rootPalette()).toBe(palette('warm-sunset'));
    await act(async () => fireEvent.click(screen.getByText('Retry')));
    expect(state()).toMatchObject({ current: 'forest-green', saving: false, pending: null });
  });
});

describe('existing theme page and fallback', () => {
  it('shows five unchanged candidate palettes, preserves layout labels, and uses honest save/retry controls', async () => {
    const save = deferred<Result>(); responses.push(row('default'), save.promise, row('forest-green'));
    render(<MemoryRouter><ColorSchemeProvider><ColorScheme /></ColorSchemeProvider></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Loading your saved theme...')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Color Schemes' })).toBeTruthy();
    const cards = COLOR_SCHEMES.map(scheme => screen.getByText(scheme.description).closest('.rounded-lg')! as HTMLElement);
    cards.forEach((card, index) => {
      const swatches = card.querySelectorAll('[aria-hidden="true"][style]');
      expect(swatches).toHaveLength(7);
      const expected = document.createElement('div');
      expected.style.backgroundColor = `hsl(${COLOR_SCHEMES[index].variables['--sidebar-background']})`;
      expect((swatches[0] as HTMLElement).style.backgroundColor).toBe(expected.style.backgroundColor);
    });
    fireEvent.click(within(cards[4]).getByRole('button', { name: 'Apply Theme' }));
    expect((screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(rootPalette()).toBe(palette('default'));
    await act(async () => save.resolve(failure));
    expect(screen.getByRole('alert').textContent).toContain('save has not been confirmed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving theme' }));
    await waitFor(() => expect(within(cards[4]).getByRole('button', { name: 'Currently Active' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Close & Return Home' })).toBeTruthy();
  });

  it('offers load retry on the real page', async () => {
    responses.push(failure, row('warm-sunset'));
    render(<MemoryRouter><ColorSchemeProvider><ColorScheme /></ColorSchemeProvider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry loading theme' }));
    await waitFor(() => expect(rootPalette()).toBe(palette('warm-sunset')));
  });

  it('renders an independent navy fallback without re-mounting the throwing subtree', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let rendered = 0;
    function Broken(): React.ReactNode { rendered++; throw new Error('render failed'); }
    applyColorScheme(getColorScheme('forest-green')!);
    const view = render(<ColorSchemeErrorBoundary><Broken /></ColorSchemeErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toContain('The app could not be displayed');
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeTruthy();
    expect(rootPalette()).toBe(palette('default'));
    const settled = rendered;
    view.rerender(<ColorSchemeErrorBoundary><Broken /></ColorSchemeErrorBoundary>);
    expect(rendered).toBe(settled);
  });
});
