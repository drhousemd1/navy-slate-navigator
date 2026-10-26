import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { createActionTransport, type ActionRpcCall, type ActionRpcResponse } from './transport';

interface ActionRpcRequest extends PromiseLike<ActionRpcResponse> {
  setHeader(name: string, value: string): ActionRpcRequest;
  abortSignal(signal: AbortSignal): ActionRpcRequest;
}
// Generated database types predate the reviewed forward migration. Keep its
// temporary typed boundary in the data layer, not in components.
const actionRpc = supabase.rpc.bind(supabase) as unknown as (
  name: ActionRpcCall['name'], parameters: ActionRpcCall['parameters'],
) => ActionRpcRequest;

/** The backend namespace comes from the same configuration as the shared client.
 * This factory performs no request until the queue executes an action.
 */
export function createSupabaseActionTransport() {
  return createActionTransport({ backendId: supabaseBackendId,
    readSession: async () => {
      const { data, error } = await supabase.auth.getSession();
      return !error && data.session ? { accountId: data.session.user.id, accessToken: data.session.access_token } : null;
    },
    callRpc: ({ name, parameters }, accessToken, signal) => actionRpc(name, parameters)
      .setHeader('Authorization', `Bearer ${accessToken}`).abortSignal(signal),
  });
}

export { createSupabaseActionTransport as createSupabaseRewardTransport };
