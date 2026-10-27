import { supabase } from '@/integrations/supabase/client';
import { decodeIdentity, decodeLinkPreview, type IdentityState, type LinkMode, type PermissionChoice } from '@/lib/identity';

interface IdentityCommands {
  set_my_profile_role: { p_role: 'dom' | 'sub' };
  set_my_timezone: { p_timezone: string };
  initialize_my_timezone: { p_timezone: string };
  generate_partner_link_code: { p_expected_relationship_id: string; p_expected_relationship_session_id: string; p_mode: LinkMode; p_previous_relationship_id: string | null };
  preview_partner_link_code: { p_code: string };
  accept_partner_link_code: { p_expected_relationship_id: string; p_expected_relationship_session_id: string; p_code: string; p_mode: LinkMode; p_previous_relationship_id: string | null };
  unlink_my_partner: { p_expected_relationship_id: string; p_expected_relationship_session_id: string };
  set_relationship_permissions: { p_permissions: Record<string, PermissionChoice>; p_expected_relationship_id: string; p_expected_relationship_session_id: string };
}
type IdentityRpcName = 'get_my_identity' | keyof IdentityCommands;
interface RpcResponse { data: unknown; error: { message: string } | null }
interface IdentityRequest extends PromiseLike<RpcResponse> {
  abortSignal(signal: AbortSignal): IdentityRequest;
  setHeader(name: string, value: string): IdentityRequest;
}

// The generated database file predates these forward migrations. Keep their
// temporary typed boundary here rather than casting individual components.
const identityRpc = supabase.rpc.bind(supabase) as unknown as (
  name: IdentityRpcName, parameters?: IdentityCommands[keyof IdentityCommands],
) => IdentityRequest;

async function requestIdentity(expectedAccountId: string, name: IdentityRpcName, parameters?: IdentityCommands[keyof IdentityCommands], signal?: AbortSignal): Promise<RpcResponse> {
  if (signal?.aborted) throw new DOMException('Identity request cancelled', 'AbortError');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (signal?.aborted) throw new DOMException('Identity request cancelled', 'AbortError');
  if (error || !session?.access_token) throw new Error('AUTH_REQUIRED');
  if (!expectedAccountId || session.user.id !== expectedAccountId) throw new Error('ACCOUNT_CHANGED');
  // SDK fetch may read the session again after this point. Its explicit header
  // support keeps this request bound to the checked actor even after a switch.
  const request = identityRpc(name, parameters).setHeader('Authorization', `Bearer ${session.access_token}`);
  return await (signal ? request.abortSignal(signal) : request);
}

export async function callIdentityCommand<Name extends keyof IdentityCommands>(expectedAccountId: string, name: Name, parameters: IdentityCommands[Name]): Promise<unknown> {
  const { data, error } = await requestIdentity(expectedAccountId, name, parameters);
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchIdentity(accountId: string, signal?: AbortSignal): Promise<IdentityState> {
  const { data, error } = await requestIdentity(accountId, 'get_my_identity', undefined, signal);
  if (error) throw new Error(error.message);
  return decodeIdentity(accountId, data);
}

export async function fetchLinkPreview(expectedAccountId: string, code: string) {
  return decodeLinkPreview(await callIdentityCommand(expectedAccountId, 'preview_partner_link_code', { p_code: code.trim().toUpperCase() }));
}

export function identityCommandError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'The account request failed. Please try again.';
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'Sign in again before updating your account.',
    ACCOUNT_CHANGED: 'The signed-in account changed. Reload this account before trying again.',
    LIFECYCLE_INTEGRATION_REQUIRED: 'Partner changes are temporarily unavailable while relationship history and privacy are upgraded. Your current connection is unchanged.',
    PERIOD_CHANGED: 'Your relationship changed while this screen was open. Refresh and review it before trying again.',
    STALE_RELATIONSHIP: 'Your relationship changed while this screen was open. Refresh and review it before trying again.',
    STALE_RELATIONSHIP_SESSION: 'Your connection changed. Refresh and review the current connection before trying again. The previous request will not be retried automatically.',
    LINK_INVITATION_STALE: 'This invitation belongs to an earlier connection. Ask your partner for a new code.',
    LIFECYCLE_ACCOUNTING_INTEGRATION_REQUIRED: 'Partner changes are temporarily unavailable while relationship accounting is upgraded. Your current connection is unchanged.',
    LIFECYCLE_WALLET_MISSING: 'Partner changes could not be completed because the current balances could not be verified. Your connection is unchanged.',
    ROLE_LIFECYCLE_INTEGRATION_REQUIRED: 'Role changes are temporarily unavailable while relationship history and balances are upgraded.',
    INVALID_LINK_CODE: 'This link code is invalid, unavailable, or belongs to a different previous relationship. Ask your partner for a new code.',
    SAME_ROLE: 'A connection needs one Dom and one Sub. Check both profile roles before linking.',
    ALREADY_LINKED_OR_INCOMPLETE: 'One account already has a connection that needs to be resolved before linking.',
    CONSENT_MISMATCH: 'The invitation changed. Preview the current code and review the connection again.',
    PREVIOUS_RELATIONSHIP_CHANGED: 'That previous relationship is no longer available to resume.',
    UNLINK_BEFORE_ROLE_CHANGE: 'Disconnect your current partner before changing your role.',
    UNLINK_BEFORE_LINKING: 'Disconnect your current partner before creating a new link code.',
    PROFILE_SETUP_REQUIRED: 'Finish setting up your profile role before connecting.',
    INVALID_TIMEZONE: 'Choose a valid timezone, such as America/Boise or Europe/London.',
  };
  return messages[message] ?? message;
}
