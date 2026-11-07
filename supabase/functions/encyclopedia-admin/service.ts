import { LibraryError, UUID, type Command } from './validation.ts';
export type Config = { supabaseUrl: string; anonKey: string; serviceKey: string };
const statuses: Record<string, number> = { EDITOR_REQUIRED: 403, ACCOUNT_UNAVAILABLE: 403, INVALID_INPUT: 400,
  ENTRY_NOT_FOUND: 404, ENTRY_REVISION_CONFLICT: 409, COMMAND_ID_REUSED: 409, ENTRY_ID_REUSED: 409 };
export function createService(config: Config, fetcher: typeof fetch, signal: AbortSignal) {
  const base = new URL(config.supabaseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new LibraryError('SAVE_UNCONFIRMED', 503);
  const request = (path: string, init: RequestInit) => fetcher(new URL(path, base), { ...init, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  const rpc = async (name: string, body: unknown) => {
    const r = await request(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const value = await r.json().catch(() => null);
    if (!r.ok) throw new LibraryError(statuses[value?.message] ? value.message : 'SAVE_UNCONFIRMED', statuses[value?.message] ?? 503);
    return value;
  };
  return {
    async actor(authorization: string | null) {
      if (!authorization?.startsWith('Bearer ') || [config.anonKey, config.serviceKey, ''].includes(authorization.slice(7))) throw new LibraryError('AUTHENTICATION_REQUIRED', 401);
      const r = await request('/auth/v1/user', { headers: { apikey: config.anonKey, Authorization: authorization } });
      if (r.status >= 500) throw new LibraryError('SAVE_UNCONFIRMED', 503);
      const value = r.ok ? await r.json().catch(() => null) : null;
      if (!UUID.test(value?.id ?? '')) throw new LibraryError('AUTHENTICATION_REQUIRED', 401);
      return value.id as string;
    },
    checkEditor: (actor: string) => rpc('encyclopedia_check_editor', { p_actor: actor }),
    async commit(actor: string, operation: string, command: Command) {
      const result = await rpc('encyclopedia_commit', { p_actor: actor, p_operation: operation, p_command_id: command.commandId,
        p_entry_id: command.entryId, p_expected_revision: command.expectedRevision, p_patch: command.patch });
      if (result?.entryId !== command.entryId || result?.revision !== command.expectedRevision + 1 || result?.deleted !== (operation === 'delete') || typeof result?.replayed !== 'boolean') throw new LibraryError('SAVE_UNCONFIRMED', 503);
      return { entryId: result.entryId, revision: result.revision, deleted: result.deleted, replayed: result.replayed };
    },
  };
}
