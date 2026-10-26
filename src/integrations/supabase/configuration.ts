export interface SupabaseEnvironment {
  VITE_BACKEND_TARGET?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export interface SupabaseConfiguration {
  url: string;
  publishableKey: string;
}

export const PRODUCTION_PROJECT_REF = 'ronqvzihpffgowyscgfm';
const PRODUCTION_HOST = `${PRODUCTION_PROJECT_REF}.supabase.co`;
const HOSTED_APP_HOSTS = new Set([
  'navy-slate-navigator.lovable.app',
  'preview--navy-slate-navigator.lovable.app',
  'id-preview--98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovable.app',
  '98e56b67-1df6-49a9-99c2-b6a9d4dcdf65.lovableproject.com',
]);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function fail(reason: string): never {
  throw new Error(`Supabase configuration: ${reason} See scripts/local-development.md.`);
}

function validatePublicKey(key: string, backend: URL) {
  if (key.startsWith('sb_publishable_') && key.length > 'sb_publishable_'.length) return;
  // Legacy public anon keys are JWTs. Never accept a service role key in a browser.
  try {
    const parts = key.split('.');
    if (parts.length !== 3) throw new Error();
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role !== 'anon') throw new Error();
    if (backend.hostname.endsWith('.supabase.co') && payload.ref &&
      payload.ref !== backend.hostname.split('.')[0]) throw new Error();
  } catch {
    fail('Use the selected project’s public publishable/anon key, never a secret or service role key.');
  }
}

/** Resolve before createClient: neither a missing config nor a copied production
 * .env may silently send local development traffic to the live database. */
export function resolveSupabaseConfiguration(
  environment: SupabaseEnvironment,
  appHostname: string,
  hostedDefaults?: SupabaseConfiguration,
): SupabaseConfiguration {
  const hosted = HOSTED_APP_HOSTS.has(appHostname.toLowerCase());
  const target = environment.VITE_BACKEND_TARGET?.trim() || (hosted ? 'production' : '');
  if (!['local', 'staging', 'production'].includes(target)) {
    fail('Select VITE_BACKEND_TARGET=local or staging and configure that backend explicitly.');
  }
  if (target === 'production' && !hosted) {
    fail('The production backend is restricted to the existing hosted app origins. Local development must use local or staging.');
  }
  const fallback = target === 'production' ? hostedDefaults : undefined;
  const rawUrl = environment.VITE_SUPABASE_URL?.trim() || fallback?.url;
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || fallback?.publishableKey;
  if (!rawUrl || !publishableKey) fail('The selected backend URL and public publishable/anon key are required.');
  let url: URL;
  try { url = new URL(rawUrl); } catch { fail('The backend URL is invalid.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    fail('Use the backend origin without credentials, path, query or fragment.');
  }
  if (target === 'local' && (!LOOPBACK_HOSTS.has(url.hostname) || !['http:', 'https:'].includes(url.protocol))) {
    fail('The local backend must use a loopback URL.');
  }
  if (target === 'staging' && (url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.hostname === PRODUCTION_HOST)) {
    fail('Staging must use a separate HTTPS Supabase project, never the production project.');
  }
  if (target === 'production' && (url.protocol !== 'https:' || url.hostname !== PRODUCTION_HOST)) {
    fail('The existing hosted production configuration must keep its original Supabase project.');
  }
  validatePublicKey(publishableKey, url);
  return { url: url.origin, publishableKey };
}
