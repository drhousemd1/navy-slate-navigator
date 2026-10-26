import type { ActionProblem, ActionQueueScope, CommandOutcome, RewardCommand, RewardTransport } from './contracts';
import { decodeActionReceipt, decodeRewardCommand } from './contracts';

export interface RewardRpcParameters {
  p_command_id: string;
  p_expected_relationship_id: string;
  p_action: RewardCommand['kind'];
  p_reward_id: string | null;
  p_event_id: string | null;
  p_inventory_currency: 'dom' | 'sub' | null;
  p_expected_cost: number | null;
}
export interface RpcFailure { message: string; code?: string; details?: string | null }
export interface RewardRpcResponse { data: unknown; error: RpcFailure | null; status?: number }
export interface RewardTransportDependencies {
  /** Canonical configured backend URL, also used as the saved queue namespace. */
  backendId: string;
  readSession(): Promise<{ accountId: string; accessToken: string } | null>;
  callRpc(parameters: RewardRpcParameters, accessToken: string, signal: AbortSignal): PromiseLike<RewardRpcResponse>;
}

const messages: Record<string, string> = {
  UNDO_USE_FIRST: 'Undo the use of this reward before undoing its purchase.',
  TIMEZONE_REQUIRED: 'Save the reward owner’s timezone before recording its use.',
  STALE_RELATIONSHIP: 'This action belongs to a previous relationship period. Review it without moving it to the current period.',
  ACCOUNTING_NOT_ENABLED: 'Reward transactions are not available for this relationship yet.',
  INSUFFICIENT_POINTS: 'There are not enough points to buy this reward.',
  INVENTORY_SELECTION_REQUIRED: 'Choose which role’s purchased reward to use.',
  NO_AVAILABLE_REWARD: 'There are no unused purchases of this reward available.',
  REWARD_DELETED: 'This reward has been removed.',
  ACTION_ALREADY_UNDONE: 'This action has already been undone.',
  ACTION_NOT_REVERSIBLE: 'This action cannot be undone.',
  COMMAND_ID_REUSED: 'The saved command identifier does not match its original request. The action was not replaced.',
  COMMAND_ACTOR_MISMATCH: 'This saved command belongs to a different account.',
  EXPECTED_REWARD_COST_REQUIRED: 'This purchase does not contain the price you reviewed. Review the current reward price before making a new purchase.',
  INVALID_EXPECTED_REWARD_COST: 'The reviewed reward price is invalid. Review the current reward price before making a new purchase.',
  REWARD_COST_CHANGED: 'The reward price changed. Review the current price before making a new purchase.',
};
export const unknownProblem = (code = 'CONFIRMATION_UNKNOWN', retryable = true): ActionProblem => ({
  code, retryable, message: 'The result has not been confirmed. The original action is saved; checking it again will reuse the same request.',
});

export function rewardCommandParameters(input: RewardCommand): RewardRpcParameters {
  const command = decodeRewardCommand(input);
  return { p_command_id: command.commandId, p_expected_relationship_id: command.expectedRelationshipId, p_action: command.kind,
    p_reward_id: command.kind === 'undo' ? null : command.rewardId,
    p_event_id: command.kind === 'undo' ? command.eventId : null,
    p_inventory_currency: command.kind === 'reward_redeem' ? command.inventoryCurrency ?? null : null,
    p_expected_cost: command.kind === 'reward_buy' ? command.expectedCost : null };
}

function rejection(error: RpcFailure): ActionProblem {
  let dependencyEventId: string | undefined;
  let expectedCost: number | undefined;
  let currentCost: number | undefined;
  if (error.message === 'UNDO_USE_FIRST' && error.details) {
    try {
      const detail: unknown = JSON.parse(error.details);
      const value = detail && typeof detail === 'object' && 'dependencyEventId' in detail ? detail.dependencyEventId : null;
      if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) dependencyEventId = value;
    } catch { /* Unstructured server details are not rendered or logged. */ }
  }
  if (error.message === 'REWARD_COST_CHANGED' && error.details) {
    try {
      const detail: unknown = JSON.parse(error.details);
      if (detail && typeof detail === 'object' && 'expectedCost' in detail && 'currentCost' in detail) {
        const validCost = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;
        if (validCost(detail.expectedCost) && validCost(detail.currentCost)) { expectedCost = detail.expectedCost; currentCost = detail.currentCost; }
      }
    } catch { /* Only validated structured costs may appear in feedback. */ }
  }
  return { code: error.message, sqlState: error.code, retryable: false, dependencyEventId, expectedCost, currentCost,
    message: expectedCost !== undefined && currentCost !== undefined
      ? `The reward now costs ${currentCost} points instead of ${expectedCost}. Review the current price before making a new purchase.`
      : messages[error.message] ?? 'The server rejected this action. Refresh its details before trying again.' };
}

export function createRewardTransport(dependencies: RewardTransportDependencies): RewardTransport {
  return { backendId: dependencies.backendId, async execute(input: RewardCommand, scope: ActionQueueScope, signal: AbortSignal): Promise<CommandOutcome> {
    let parameters: RewardRpcParameters;
    try { parameters = rewardCommandParameters(input); }
    catch { return { kind: 'not_sent', problem: { code: 'INVALID_SAVED_COMMAND', message: 'The saved action could not be validated. It was kept for review.', retryable: false } }; }
    if (scope.backendId !== dependencies.backendId || scope.relationshipId !== input.expectedRelationshipId) return { kind: 'not_sent', problem: { code: 'SCOPE_MISMATCH', message: 'This action belongs to a different backend or relationship period.', retryable: false } };
    let session: Awaited<ReturnType<RewardTransportDependencies['readSession']>>;
    try { session = await dependencies.readSession(); }
    catch { session = null; }
    if (!session?.accessToken || session.accountId !== scope.accountId || signal.aborted) return { kind: 'not_sent', problem: { code: 'IDENTITY_UNAVAILABLE', message: 'Sign in to the original account before sending this saved action.', retryable: false } };
    try {
      // The token is captured for this account; a later login cannot change the
      // actor of an already-started RPC. Tokens are never returned or persisted.
      const { data, error, status } = await dependencies.callRpc(parameters, session.accessToken, signal);
      if (error) {
        if ((error.code === '22023' || error.code === '42501') && (!status || status < 500)) return { kind: 'rejected', problem: rejection(error) };
        return { kind: 'confirmation_unknown', problem: unknownProblem(error.code ?? 'REQUEST_FAILED') };
      }
      try { return { kind: 'confirmed', receipt: decodeActionReceipt(data, input) }; }
      catch { return { kind: 'confirmation_unknown', problem: unknownProblem('INVALID_RECEIPT', false) }; }
    } catch {
      return { kind: 'confirmation_unknown', problem: unknownProblem(signal.aborted ? 'REQUEST_INTERRUPTED' : 'CONNECTION_LOST') };
    }
  } };
}
