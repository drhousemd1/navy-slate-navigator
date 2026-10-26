import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({ auth: {} })) }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_BACKEND_TARGET', '');
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test('the actual shared client refuses to initialize locally without isolated configuration', async () => {
  await expect(import('../src/integrations/supabase/client')).rejects.toThrow('Select VITE_BACKEND_TARGET');
  expect(createClient).not.toHaveBeenCalled();
});

test('the actual shared client receives the selected isolated backend', async () => {
  vi.stubEnv('VITE_BACKEND_TARGET', 'local');
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  await import('../src/integrations/supabase/client');
  expect(createClient).toHaveBeenCalledWith('http://127.0.0.1:54321', 'sb_publishable_test', expect.objectContaining({
    auth: expect.objectContaining({ persistSession: true, detectSessionInUrl: true }),
  }));
});

test('the actual hosted client retains the original backend and auth options', async () => {
  vi.stubGlobal('window', { location: { hostname: 'navy-slate-navigator.lovable.app' }, localStorage: window.localStorage });
  await import('../src/integrations/supabase/client');
  expect(createClient).toHaveBeenCalledWith('https://ronqvzihpffgowyscgfm.supabase.co', expect.any(String), expect.objectContaining({
    auth: expect.objectContaining({ persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }),
  }));
});
