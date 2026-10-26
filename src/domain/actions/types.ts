/** Server command contract. Nothing in this module grants browser-side authority. */
export type Role = 'dom' | 'sub';
export type Currency = Role;
export type PermissionValue = Role | 'both';
export type ConfigurableOperation =
  | 'task_complete' | 'task_undo'
  | 'rule_violation' | 'rule_violation_undo'
  | 'punishment_apply' | 'punishment_undo'
  | 'sub_reward_redeem' | 'sub_reward_redeem_undo'
  | 'definition_manage';
export type FixedOperation =
  | 'sub_reward_buy' | 'sub_reward_buy_undo'
  | 'dom_reward_buy' | 'dom_reward_buy_undo'
  | 'dom_reward_redeem' | 'dom_reward_redeem_undo' | 'reward_gift';
export type Operation = ConfigurableOperation | FixedOperation;

/** Must be resolved and revalidated by the server within the command transaction. */
export interface ActionIdentity {
  readonly relationshipId: string;
  /** Independent of lifecycle readiness for unlink/archive operations. */
  readonly accountingEnabled: boolean;
  readonly actorParticipantId: string;
  readonly actorRole: Role;
  readonly participants: Readonly<Record<Role, string | null>>;
  readonly permissions: Readonly<Record<ConfigurableOperation, PermissionValue>>;
}

/** Actor, beneficiary, prices, balances and permissions are deliberately not client inputs. */
export type ActionCommand = {
  readonly commandId: string;
  readonly expectedRelationshipId: string;
} & (
  | { readonly kind: 'task_complete'; readonly taskId: string }
  | { readonly kind: 'rule_violation'; readonly ruleId: string }
  | { readonly kind: 'punishment_apply'; readonly punishmentId: string }
  | { readonly kind: 'reward_buy' | 'reward_delete' | 'reward_gift'; readonly rewardId: string }
  | { readonly kind: 'reward_redeem'; readonly rewardId: string; readonly inventoryCurrency?: Currency }
  | { readonly kind: 'undo'; readonly eventId: string }
);

export interface PointDelta {
  readonly participantId: string;
  readonly currency: Currency;
  readonly amount: number;
}

export interface WalletBalance {
  readonly participantId: string;
  readonly currency: Currency;
  readonly balance: number;
}

export type LotPrice =
  | { readonly kind: 'paid'; readonly paidPrice: number }
  | { readonly kind: 'gift'; readonly paidPrice: 0 }
  | {
      readonly kind: 'legacy';
      readonly paidPrice: null;
      readonly migrationCredit: {
        readonly amount: number;
        readonly valuationId: string;
        readonly basis: 'cutover_catalog_cost';
      } | null;
    };

/** One unit per existing Buy action. Current status is a projection of immutable movements. */
export interface InventoryLot {
  readonly id: string;
  readonly relationshipId: string;
  readonly rewardId: string;
  readonly ownerParticipantId: string;
  readonly currency: Currency;
  readonly acquisitionEventId: string;
  readonly createdAt: string;
  readonly price: LotPrice;
  readonly status: 'available' | 'redeemed' | 'cancelled';
  readonly activeRedemptionEventId: string | null;
}

export type ActionEventKind =
  | 'task_completed' | 'rule_violated' | 'punishment_applied'
  | 'reward_purchased' | 'reward_redeemed' | 'reward_gifted'
  | 'reward_deleted' | 'action_undone' | 'opening_balance' | 'opening_inventory';

/** Append-only accepted event; names/amounts survive definition changes and soft deletion.
 * Participant IDs are opaque. Identity display comes from a separately authorized projection.
 */
export interface ActionEvent {
  readonly id: string;
  readonly commandId: string | null;
  readonly relationshipId: string;
  readonly kind: ActionEventKind;
  readonly actorParticipantId: string | null;
  readonly beneficiaryParticipantId: string | null;
  readonly recordedAt: string;
  readonly subject: {
    readonly type: 'task' | 'rule' | 'punishment' | 'reward' | 'wallet';
    readonly id: string | null;
    readonly title: string;
    readonly role: Role | null;
  };
  readonly definitionValues:
    | { readonly type: 'task'; readonly points: number; readonly frequency: 'daily' | 'weekly'; readonly target: number }
    | { readonly type: 'reward'; readonly cost: number }
    | { readonly type: 'punishment'; readonly subDeduction: number; readonly domAward: number }
    | null;
  readonly calendar: {
    readonly participantId: string;
    readonly timeZone: string;
    readonly localDate: string;
    readonly weekStartDate: string;
  } | null;
  readonly points: readonly PointDelta[];
  readonly inventory: readonly {
    lotId: string;
    from: InventoryLot['status'] | null;
    to: InventoryLot['status'];
  }[];
  readonly reversesEventId: string | null;
  readonly provenance: 'command' | 'legacy_import' | 'migration_credit';
}

/** Persist atomically with events/effects. Retry of the same actor/command ID returns this receipt.
 * The server must reject that ID with changed payload, stale period or changed authenticated actor.
 */
export interface ActionReceipt {
  readonly commandId: string;
  readonly relationshipId: string;
  readonly eventIds: readonly string[];
  readonly confirmedAt: string;
  readonly balances: readonly WalletBalance[];
  readonly inventorySelection?: { readonly requestedCurrency: Currency | null; readonly allocatedCurrency: Currency } | null;
  readonly availableRewardQuantities: readonly {
    rewardId: string;
    ownerParticipantId: string;
    currency: Currency;
    quantity: number;
  }[];
  readonly refunds: readonly RefundTotal[];
  /** Deduplicate animation/in-app delivery/push per event and recipient, not per HTTP response. */
  readonly feedback: readonly ActionFeedback[];
}

export type ActionFeedback = {
  readonly eventId: string;
  readonly recipientParticipantId: string;
  readonly subjectTitle: string;
} & (
  | { readonly kind: 'action_confirmed' }
  | {
      readonly kind: 'points_refunded';
      readonly reason: 'reward_deleted' | 'purchase_undone' | 'redemption_undone_after_deletion';
      readonly currency: Currency;
      readonly points: number;
      readonly balanceAfter: number;
    }
);

export type PendingActionState =
  | { readonly status: 'pending' | 'sending' | 'confirmation_unknown'; readonly command: ActionCommand }
  | { readonly status: 'confirmed'; readonly receipt: ActionReceipt }
  | { readonly status: 'rejected'; readonly command: ActionCommand; readonly reason: string };

export interface RefundTotal {
  readonly participantId: string;
  readonly currency: Currency;
  readonly paidPoints: number;
  readonly migrationCredit: number;
  readonly total: number;
}
