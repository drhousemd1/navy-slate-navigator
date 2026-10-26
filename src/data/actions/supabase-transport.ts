import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { createRewardTransport, type RewardRpcParameters, type RewardRpcResponse } from './transport';

interface RewardRpcRequest extends PromiseLike<RewardRpcResponse> {
  setHeader(name: string, value: string): RewardRpcRequest;
  abortSignal(signal: AbortSignal): RewardRpcRequest;
}
// Generated database types predate the reviewed forward migration. Keep its
// temporary typed boundary in the data layer, not in components.
const rewardRpc = supabase.rpc.bind(supabase) as unknown as (
  name: 'execute_reward_command', parameters: RewardRpcParameters,
) => RewardRpcRequest;

/** The backend namespace comes from the same configuration as the shared client.
 * This factory performs no request until the queue executes an action.
 */
export function createSupabaseRewardTransport() {
  return createRewardTransport({ backendId: supabaseBackendId,
    readSession: async () => {
      const { data, error } = await supabase.auth.getSession();
      return !error && data.session ? { accountId: data.session.user.id, accessToken: data.session.access_token } : null;
    },
    callRpc: (parameters, accessToken, signal) => rewardRpc('execute_reward_command', parameters)
      .setHeader('Authorization', `Bearer ${accessToken}`).abortSignal(signal),
  });
}
