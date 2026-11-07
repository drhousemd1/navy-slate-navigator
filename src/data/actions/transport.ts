import type { TaskExpectedContext, RuleExpectedContext, PunishmentExpectedContext } from '@/domain/actions/types';
import type { ActionProblem, ActionQueueScope, CommandOutcome, QueuedActionCommand, RewardCommand, ActionTransport, ReceiptRecoveryOutcome, StoredActionScope } from './contracts';
import { decodeActionReceipt, decodeActionCommand, decodeActionScope, decodeStoredActionScope, decodeStoredActionCommand, decodeRewardCommand } from './contracts';

export interface RewardRpcParameters {
  p_command_id: string;
  p_expected_relationship_id: string;
  p_action: RewardCommand['kind'];
  p_reward_id: string | null;
  p_event_id: string | null;
  p_inventory_currency: 'dom' | 'sub' | null;
  p_expected_cost: number | null;
  p_expected_relationship_session_id: string;
}
export interface RpcFailure { message: string; code?: string; details?: string | null }
export interface ActionRpcResponse { data: unknown; error: RpcFailure | null; status?: number }
export type RewardRpcResponse = ActionRpcResponse;
interface ReceiptRpcParameters { p_command_id: string; p_expected_relationship_id: string }
interface ScopedRpcParameters extends ReceiptRpcParameters { p_expected_relationship_session_id: string }
export type ActionRpcCall =
  | { name: 'execute_reward_command'; parameters: RewardRpcParameters }
  | { name: 'execute_task_command'; parameters: ScopedRpcParameters & { p_action: 'task_complete'; p_task_id: string; p_event_id: null; p_expected_context: TaskExpectedContext } }
  | { name: 'execute_recording_command'; parameters: ScopedRpcParameters & (
      { p_action: 'rule_violation'; p_rule_id: string; p_punishment_id: null; p_event_id: null; p_expected_context: RuleExpectedContext } |
      { p_action: 'punishment_apply'; p_rule_id: null; p_punishment_id: string; p_event_id: null; p_expected_context: PunishmentExpectedContext }) }
  | { name: 'undo_action'; parameters: ScopedRpcParameters & { p_event_id: string } }
  | { name: 'get_my_action_receipt'; parameters: ReceiptRpcParameters };
export interface ActionTransportDependencies {
  /** Canonical configured backend URL, also used as the saved queue namespace. */
  backendId: string;
  readSession(): Promise<{ accountId: string; accessToken: string } | null>;
  callRpc(call: ActionRpcCall, accessToken: string, signal: AbortSignal): PromiseLike<ActionRpcResponse>;
}
export type RewardTransportDependencies = ActionTransportDependencies;

const messages: Record<string, string> = {
  ACTION_CONTEXT_REQUIRED: 'This saved action does not include the details originally reviewed. Check its result; it will not be sent again.',
  ACTION_CONTEXT_INVALID: 'The saved action’s reviewed details could not be verified. Check its result before taking another action.',
  ACTION_BENEFICIARY_CHANGED: 'The person affected by this action changed. Review the current details before taking a new action.',
  ACTION_DEFINITION_CHANGED: 'The points, assigned role, or target changed. Review the current details before taking a new action.',
  ACTION_TIMEZONE_CHANGED: 'An affected person’s saved timezone changed. Review the current calendar before taking a new action.',
  ACTION_DATE_CHANGED: 'The day changed for an affected person. This saved action was not moved to today. Review the current calendar before taking a new action.',
  UNDO_USE_FIRST: 'Undo the use of this reward before undoing its purchase.',
  TIMEZONE_REQUIRED: 'A participant affected by this action needs a saved timezone before it can be recorded.',
  STALE_RELATIONSHIP: 'This action belongs to a previous relationship period. Review it without moving it to the current period.',
  STALE_RELATIONSHIP_SESSION: 'This relationship was closed or restarted after the action was saved. Check for its existing receipt; this old intent cannot be sent again.',
  ACCOUNTING_NOT_ENABLED: 'Action recording is not available for this relationship yet.',
  AUTHENTICATION_REQUIRED: 'Sign in to the original account before recording this action.',
  ACTION_NOT_ALLOWED: 'Your current role and relationship permissions do not allow this action.',
  TASK_NOT_FOUND: 'This task is unavailable in the current relationship.',
  TASK_DELETED: 'This task has been removed. Its existing history remains available.',
  TASK_TARGET_REACHED: 'This task has already reached its target for the current period. Refresh its progress before recording another completion.',
  TASK_OWNER_MISSING: 'This task needs a participant with its assigned role before it can be completed.',
  INVALID_TASK_DEFINITION: 'Review this task’s points, frequency, target, and deadline before recording a completion.',
  SUB_PARTICIPANT_REQUIRED: 'A Sub participant is required to record this rule violation or punishment.',
  RECORDING_NOT_INITIALIZED: 'This relationship’s rule and punishment history has not been prepared yet.',
  RECORDING_SUBJECT_NOT_FOUND: 'This rule or punishment is unavailable in the current relationship.',
  DEFINITION_DELETED: 'This rule or punishment has been removed. Its existing history remains available.',
  INVALID_PUNISHMENT_DEFINITION: 'Review this punishment’s Sub deduction and Dom award before applying it.',
  ORIGINAL_BENEFICIARY_REQUIRED: 'The original recipient could not be verified in this relationship. Keep this action for review.',
  INVALID_ORIGINAL_TASK_AWARD: 'The original task’s point records could not be verified. Keep this action for review.',
  ORIGINAL_TASK_AWARD_MISSING: 'The original task’s point records are missing. Keep this action for review.',
  INVALID_ORIGINAL_RECORDING_DELTA: 'The original action’s point records could not be verified. Keep this action for review.',
  ORIGINAL_PUNISHMENT_DELTA_MISSING: 'The original punishment’s point records are incomplete. Keep this action for review.',
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

export function rewardCommandParameters(input: RewardCommand, inputScope: ActionQueueScope): RewardRpcParameters {
  const command = decodeRewardCommand(input);
  const actionScope = decodeActionScope(inputScope);
  return { p_command_id: command.commandId, p_expected_relationship_id: command.expectedRelationshipId, p_action: command.kind,
    p_reward_id: command.kind === 'undo' ? null : command.rewardId,
    p_event_id: command.kind === 'undo' ? command.eventId : null,
    p_inventory_currency: command.kind === 'reward_redeem' ? command.inventoryCurrency ?? null : null,
    p_expected_cost: command.kind === 'reward_buy' ? command.expectedCost : null,
    p_expected_relationship_session_id: actionScope.relationshipSessionId };
}

/** Only canonical target IDs and consent preconditions cross this boundary.
 * Undo's family comes from the server's original event, never a client guess.
 */
export function actionCommandRequest(input: QueuedActionCommand, inputScope: ActionQueueScope): ActionRpcCall {
  const command = decodeActionCommand(input);
  const actionScope = decodeActionScope(inputScope);
  const scope = { p_command_id: command.commandId, p_expected_relationship_id: command.expectedRelationshipId,
    p_expected_relationship_session_id: actionScope.relationshipSessionId };
  switch (command.kind) {
    case 'task_complete': return { name: 'execute_task_command', parameters: { ...scope, p_action: command.kind, p_task_id: command.taskId, p_event_id: null, p_expected_context: command.expectedContext } };
    case 'rule_violation': return { name: 'execute_recording_command', parameters: { ...scope, p_action: command.kind, p_rule_id: command.ruleId, p_punishment_id: null, p_event_id: null, p_expected_context: command.expectedContext } };
    case 'punishment_apply': return { name: 'execute_recording_command', parameters: { ...scope, p_action: command.kind, p_rule_id: null, p_punishment_id: command.punishmentId, p_event_id: null, p_expected_context: command.expectedContext } };
    case 'undo': return { name: 'undo_action', parameters: { ...scope, p_event_id: command.eventId } };
    default: return { name: 'execute_reward_command', parameters: rewardCommandParameters(command, actionScope) };
  }
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

export function createActionTransport(dependencies: ActionTransportDependencies): ActionTransport {
  return { backendId: dependencies.backendId, async execute(input: QueuedActionCommand, scope: ActionQueueScope, signal: AbortSignal): Promise<CommandOutcome> {
    let call: ActionRpcCall;
    try { call = actionCommandRequest(input, scope); }
    catch { return { kind: 'not_sent', problem: { code: 'INVALID_SAVED_COMMAND', message: 'The saved action could not be validated. It was kept for review.', retryable: false } }; }
    if (scope.backendId !== dependencies.backendId || scope.relationshipId !== input.expectedRelationshipId) return { kind: 'not_sent', problem: { code: 'SCOPE_MISMATCH', message: 'This action belongs to a different backend or relationship period.', retryable: false } };
    let session: Awaited<ReturnType<ActionTransportDependencies['readSession']>>;
    try { session = await dependencies.readSession(); }
    catch { session = null; }
    if (!session?.accessToken || session.accountId !== scope.accountId || signal.aborted) return { kind: 'not_sent', problem: { code: 'IDENTITY_UNAVAILABLE', message: 'Sign in to the original account before sending this saved action.', retryable: false } };
    try {
      // The token is captured for this account; a later login cannot change the
      // actor of an already-started RPC. Tokens are never returned or persisted.
      const { data, error, status } = await dependencies.callRpc(call, session.accessToken, signal);
      if (error) {
        if ((error.code === '22023' || error.code === '42501') && (!status || status < 500)) return { kind: 'rejected', problem: rejection(error) };
        return { kind: 'confirmation_unknown', problem: unknownProblem(error.code ?? 'REQUEST_FAILED') };
      }
      try { return { kind: 'confirmed', receipt: decodeActionReceipt(data, input, scope.relationshipSessionId) }; }
      catch { return { kind: 'confirmation_unknown', problem: unknownProblem('INVALID_RECEIPT', false) }; }
    } catch {
      return { kind: 'confirmation_unknown', problem: unknownProblem(signal.aborted ? 'REQUEST_INTERRUPTED' : 'CONNECTION_LOST') };
    }
  }, async readReceipt(input: QueuedActionCommand, scope: StoredActionScope, signal: AbortSignal): Promise<ReceiptRecoveryOutcome> {
    const unavailable = (code: string): ReceiptRecoveryOutcome => ({ kind: 'unavailable', problem: { code, retryable: true,
      message: 'The original receipt could not be checked. The saved action is unchanged; no action was sent.' } });
    try {
      decodeStoredActionCommand(input); decodeStoredActionScope(scope);
      if (scope.backendId !== dependencies.backendId || scope.relationshipId !== input.expectedRelationshipId) return unavailable('SCOPE_MISMATCH');
      const session = await dependencies.readSession();
      if (!session?.accessToken || session.accountId !== scope.accountId || signal.aborted) return unavailable('IDENTITY_UNAVAILABLE');
      const { data, error } = await dependencies.callRpc({ name: 'get_my_action_receipt', parameters: {
        p_command_id: input.commandId, p_expected_relationship_id: input.expectedRelationshipId,
      } }, session.accessToken, signal);
      // The lookup's token is pinned to the original owner. Also suppress late
      // results after this tab changes accounts, before returning any receipt.
      const current = await dependencies.readSession();
      if (signal.aborted || !current?.accessToken || current.accountId !== scope.accountId) return unavailable('IDENTITY_UNAVAILABLE');
      if (error) return unavailable('RECEIPT_LOOKUP_FAILED');
      if (data === null) return { kind: 'not_found' };
      try { return { kind: 'confirmed', receipt: decodeActionReceipt(data, input, scope.relationshipSessionId) }; }
      catch { return unavailable('INVALID_RECEIPT'); }
    } catch { return unavailable('RECEIPT_LOOKUP_FAILED'); }
  } };
}

/** Compatibility export; it uses the same generalized implementation. */
export { createActionTransport as createRewardTransport };
