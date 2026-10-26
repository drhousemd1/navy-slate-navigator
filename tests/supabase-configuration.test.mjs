import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSupabaseConfiguration, PRODUCTION_PROJECT_REF } from '../src/integrations/supabase/configuration.ts';

const publicKey = (ref, role = 'anon') => `test.${Buffer.from(JSON.stringify({ ref, role })).toString('base64url')}.test`;
const production = { url: `https://${PRODUCTION_PROJECT_REF}.supabase.co`, publishableKey: publicKey(PRODUCTION_PROJECT_REF) };
const local = { VITE_BACKEND_TARGET: 'local', VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: publicKey('local') };
const staging = { VITE_BACKEND_TARGET: 'staging', VITE_SUPABASE_URL: 'https://isolatedtest.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: publicKey('isolatedtest') };

test('existing hosted preview and published origins retain their production backend', () => {
  for (const hostname of ['navy-slate-navigator.lovable.app', 'preview--navy-slate-navigator.lovable.app', 'id-preview--98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovable.app', '98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com']) {
    assert.deepEqual(resolveSupabaseConfiguration({}, hostname, production), production);
  }
});

test('localhost, LAN and unrelated hosted origins cannot inherit production', () => {
  for (const hostname of ['localhost', '127.0.0.1', '192.168.1.7', 'unrelated.lovable.app', '']) {
    assert.throws(() => resolveSupabaseConfiguration({}, hostname, production), /Select VITE_BACKEND_TARGET/);
    assert.throws(() => resolveSupabaseConfiguration({ VITE_BACKEND_TARGET: 'production' }, hostname, production), /restricted/);
  }
});

test('copied production URL is rejected for both isolated targets', () => {
  for (const env of [local, staging]) assert.throws(() => resolveSupabaseConfiguration({ ...env, VITE_SUPABASE_URL: production.url }, 'localhost', production));
});

test('explicit local and staging configuration works without hosted defaults', () => {
  for (const env of [local, staging]) assert.deepEqual(resolveSupabaseConfiguration(env, 'localhost'), { url: env.VITE_SUPABASE_URL, publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY });
});

test('local connection requires loopback; staging requires separate HTTPS project', () => {
  for (const url of ['https://other.supabase.co', 'http://192.168.1.2:54321', 'file:///tmp/backend']) assert.throws(() => resolveSupabaseConfiguration({ ...local, VITE_SUPABASE_URL: url }, 'localhost'));
  for (const url of ['http://isolatedtest.supabase.co', 'https://example.com', 'https://isolatedtest.supabase.co.evil.test']) assert.throws(() => resolveSupabaseConfiguration({ ...staging, VITE_SUPABASE_URL: url }, 'localhost'));
});

test('missing isolated values never fall back to production defaults', () => {
  for (const env of [{ VITE_BACKEND_TARGET: 'local' }, { ...staging, VITE_SUPABASE_PUBLISHABLE_KEY: '' }, { ...local, VITE_SUPABASE_URL: '' }]) assert.throws(() => resolveSupabaseConfiguration(env, 'localhost', production), /required/);
});

test('rejects embedded credentials and URL suffixes', () => {
  for (const url of ['http://user:password@localhost:54321', 'http://localhost:54321/rest/v1', 'http://localhost:54321?key=value', 'http://localhost:54321#x', 'not-a-url']) assert.throws(() => resolveSupabaseConfiguration({ ...local, VITE_SUPABASE_URL: url }, 'localhost'));
});

test('rejects secret, service role, malformed and wrong-project JWT keys', () => {
  for (const key of ['sb_secret_example', 'invalid', publicKey('isolatedtest', 'service_role'), publicKey(PRODUCTION_PROJECT_REF)]) assert.throws(() => resolveSupabaseConfiguration({ ...staging, VITE_SUPABASE_PUBLISHABLE_KEY: key }, 'localhost'), /public publishable\/anon key/);
  assert.equal(resolveSupabaseConfiguration({ ...local, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }, 'localhost').publishableKey, 'sb_publishable_example');
});

test('production cannot silently switch project on an existing deployment', () => {
  assert.throws(() => resolveSupabaseConfiguration({ VITE_SUPABASE_URL: staging.VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: staging.VITE_SUPABASE_PUBLISHABLE_KEY }, 'navy-slate-navigator.lovable.app', production), /original Supabase project/);
});
