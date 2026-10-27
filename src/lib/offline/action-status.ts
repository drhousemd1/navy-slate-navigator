export const actionLabels: Record<string, string> = {
  reward_buy: 'Buy', reward_redeem: 'Use', reward_gift: 'Gift', reward_delete: 'Delete reward', undo: 'Undo',
  task_complete: 'Complete task', rule_violation: 'Record rule violation', punishment_apply: 'Apply punishment',
};
export function savedActionStatus(status: string, readOnly = false) {
  return status === 'confirmation_unknown' || (readOnly && status === 'sending') ? 'Confirmation unknown; it may already be recorded' :
    status === 'sending' ? 'Checking and sending…' : status === 'pending' ? 'Pending; saved on this device' : 'Rejected; not completed';
}
