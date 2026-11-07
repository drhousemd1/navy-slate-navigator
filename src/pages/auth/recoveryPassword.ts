import type { Session } from '@supabase/supabase-js';
import { supabaseBackendId, supabasePublicKey } from '@/integrations/supabase/client';
import { sessionOwner } from '@/lib/ownedSignOut';

const unconfirmed = 'The password update could not be confirmed. Try signing in with your new password before requesting another reset link.';

/** The SDK updateUser re-reads and later saves the current session. Recovery must
 * instead update only this captured account, without adopting any returned session. */
export async function updateRecoveryPassword(session: Session, password: string): Promise<void> {
  if (!sessionOwner(supabaseBackendId, session)) throw new Error('Your recovery session could not be verified. Request a new reset link.');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error(unconfirmed)); }, 20_000);
  });
  const request = async () => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(`${supabaseBackendId}/auth/v1/user`, {
        method: 'PUT', redirect: 'error', signal: controller.signal,
        headers: { apikey: supabasePublicKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      body = await response.json();
    } catch { throw new Error(unconfirmed); }
    if (!response.ok) {
      if (response.status >= 500) throw new Error(unconfirmed);
      const error = body as { msg?: unknown; message?: unknown } | null;
      const message = error?.msg ?? error?.message;
      throw new Error(typeof message === 'string' ? message : 'The password could not be updated. Please try again.');
    }
    if (!body || typeof body !== 'object' || (body as { id?: unknown }).id !== session.user.id) throw new Error(unconfirmed);
  };
  try { await Promise.race([request(), timeout]); }
  finally { clearTimeout(timer!); controller.abort(); }
}
