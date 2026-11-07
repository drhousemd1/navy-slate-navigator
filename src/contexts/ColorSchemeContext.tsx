import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { applyColorScheme, getColorScheme } from '@/lib/colorSchemes';

interface ColorSchemeContextType {
  currentScheme: string;
  applyScheme: (schemeName: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  pendingScheme: string | null;
  error: { kind: 'load' | 'save'; message: string } | null;
  retry: () => Promise<void>;
  canApply: boolean;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (!context) throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  return context;
}

// Bound the whole operation, including SDK session reads, rather than just fetch.
async function themeRequest(accountId: string, controller: AbortController, choice?: string): Promise<string> {
  const signal = controller.signal;
  const checkAccount = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (signal.aborted) throw new Error('THEME_CANCELLED');
    if (error || data.session?.user.id !== accountId || !data.session.access_token) throw new Error('THEME_ACCOUNT_CHANGED');
    return data.session.access_token;
  };
  let rejectAbort!: (reason: Error) => void;
  const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(new Error('THEME_UNCONFIRMED'));
  signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    if (signal.aborted) throw new Error('THEME_CANCELLED');
    return await Promise.race([aborted, (async () => {
      const jwt = await checkAccount();
      const table = supabase.from('user_color_schemes');
      const request = choice === undefined
        ? table.select('user_id, scheme_name').eq('user_id', accountId).abortSignal(signal).maybeSingle()
        : table.upsert({ user_id: accountId, scheme_name: choice }, { onConflict: 'user_id' })
          .select('user_id, scheme_name').abortSignal(signal).single();
      const { data, error } = await request.setHeader('Authorization', `Bearer ${jwt}`);
      if (signal.aborted) throw new Error('THEME_CANCELLED');
      if (error) throw new Error('THEME_UNCONFIRMED');
      await checkAccount();
      if (data === null && choice === undefined) return 'default';
      if (!data || data.user_id !== accountId || !getColorScheme(data.scheme_name) ||
        (choice !== undefined && data.scheme_name !== choice)) throw new Error('INVALID_THEME_RESPONSE');
      return data.scheme_name;
    })()]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

interface ThemeState {
  generation: number;
  confirmed: string;
  status: 'loading' | 'ready' | 'saving' | 'error';
  pending: string | null;
  error: ColorSchemeContextType['error'];
}
const initialState = (generation: number, loading: boolean): ThemeState => ({
  generation, confirmed: 'default', status: loading ? 'loading' : 'ready', pending: null, error: null,
});

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const accountId = loading ? null : user?.id ?? null;
  const scopeKey = loading ? 'loading' : accountId ?? 'signed-out';
  const scope = useRef({ key: scopeKey, generation: 0 });
  // Fence old closures immediately, including A -> B -> A before a response.
  if (scope.current.key !== scopeKey) scope.current = { key: scopeKey, generation: scope.current.generation + 1 };
  const generation = scope.current.generation;
  const [state, setState] = useState(() => initialState(generation, true));
  const mounted = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const visible = state.generation === generation ? state : initialState(generation, Boolean(loading || accountId));

  const run = useCallback(async (choice?: string) => {
    if (!accountId || !mounted.current || scope.current.generation !== generation || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const current = () => mounted.current && scope.current.generation === generation && operation.current === controller;
    setState(previous => ({ ...previous, status: choice === undefined ? 'loading' : 'saving', pending: choice ?? null, error: null }));
    try {
      const confirmed = await themeRequest(accountId, controller, choice);
      if (!current()) return;
      applyColorScheme(getColorScheme(confirmed)!);
      setState({ generation, confirmed, status: 'ready', pending: null, error: null });
    } catch {
      if (!current()) return;
      setState(previous => ({ ...previous, status: 'error', pending: choice ?? null, error: {
        kind: choice === undefined ? 'load' : 'save',
        message: choice === undefined
          ? 'Your saved theme could not be loaded. The default theme is displayed. Retry before choosing a theme.'
          : 'This save has not been confirmed. Your previously confirmed theme is still displayed. Retry saving your selected theme.',
      } }));
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  }, [accountId, generation]);

  useLayoutEffect(() => {
    mounted.current = true;
    // Never read or erase the old, unowned localStorage "color-scheme" value.
    // Reset CSS before paint so another account's palette cannot flash through.
    applyColorScheme(getColorScheme('default')!);
    setState(initialState(generation, Boolean(loading || accountId)));
    if (accountId) void run();
    return () => {
      mounted.current = false;
      const previous = operation.current;
      operation.current = null;
      previous?.abort();
      applyColorScheme(getColorScheme('default')!);
    };
  }, [accountId, generation, loading, run]);

  const applyScheme = async (choice: string) => {
    if (!getColorScheme(choice) || visible.status !== 'ready' || !accountId) return;
    if (choice !== visible.confirmed) await run(choice);
  };
  const retry = async () => {
    if (visible.status !== 'error') return;
    await run(visible.pending ?? undefined);
  };

  return <ColorSchemeContext.Provider value={{
    currentScheme: visible.confirmed,
    applyScheme,
    isLoading: visible.status === 'loading',
    isSaving: visible.status === 'saving',
    pendingScheme: visible.pending,
    error: visible.error,
    retry,
    canApply: Boolean(accountId) && visible.status === 'ready',
  }}>{children}</ColorSchemeContext.Provider>;
}
