import type { ProfileRole } from '@/types/profile';

export type IdentityStatus = 'signed-out' | 'loading' | 'error' | 'unlinked' | 'linked' | 'invalid';
export type PermissionChoice = 'dom' | 'sub' | 'both';
export type LinkMode = 'fresh' | 'continue';
export interface LinkPreview { mode: LinkMode; previousRelationshipId: string | null; canContinuePrevious: boolean }

export interface IdentityProfile {
  id: string;
  role: string | null;
  linked_partner_id: string | null;
}

export interface IdentityState {
  status: IdentityStatus;
  currentUserId: string | null;
  currentRole: ProfileRole | null;
  partnerUserId: string | null;
  subUserId: string | null;
  domUserId: string | null;
  error: string | null;
  canAccessData: boolean;
  relationshipSessionId: string | null;
  problem?: string;
  partnerRole?: ProfileRole | null;
  partnerLinkCode?: string | null;
  relationshipId?: string | null;
  participantId?: string | null;
  relationshipStatus?: string | null;
  lifecycleReady?: boolean;
  permissions?: Readonly<Record<string, PermissionChoice>>;
  timezone?: string | null;
  timezoneInitializationError?: string | null;
}

export function emptyIdentity(status: IdentityStatus, currentUserId: string | null = null, error: string | null = null): IdentityState {
  return { status, currentUserId, currentRole: null, partnerUserId: null, subUserId: null, domUserId: null, error, canAccessData: false, relationshipSessionId: null };
}

export const isRelationshipSessionId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function isProfileRole(role: string | null): role is ProfileRole {
  return role === 'sub' || role === 'dom';
}

/** A missing role stays missing. Data scope and a person's role are different facts. */
export function resolveIdentity(
  accountId: string,
  profile: IdentityProfile | null,
  partner: IdentityProfile | null = null,
): IdentityState {
  const invalid = (message: string) => emptyIdentity('invalid', accountId, message);
  if (!profile || profile.id !== accountId) return invalid('Your account profile could not be verified.');
  if (!isProfileRole(profile.role)) return invalid('Your profile needs a valid Dom or Sub role.');
  const own = { currentUserId: accountId, currentRole: profile.role };

  if (!profile.linked_partner_id) {
    return {
      ...emptyIdentity('unlinked', accountId), ...own, canAccessData: true,
      subUserId: profile.role === 'sub' ? accountId : null,
      domUserId: profile.role === 'dom' ? accountId : null,
    };
  }

  const invalidPair = (message: string): IdentityState => ({
    ...invalid(message), ...own, partnerUserId: profile.linked_partner_id,
  });
  if (profile.linked_partner_id === accountId) return invalidPair('Your account cannot be linked to itself.');
  if (!partner || partner.id !== profile.linked_partner_id) return invalidPair('Your linked partner profile could not be verified.');
  if (partner.linked_partner_id !== accountId) return invalidPair('The partner connection is incomplete. Reconnect the accounts before using shared data.');
  if (!isProfileRole(partner.role)) return invalidPair('Your linked partner needs a valid Dom or Sub role.');
  if (profile.role === partner.role) return invalidPair('The linked accounts have the same role. A Dom/Sub connection needs one of each role.');

  return {
    ...emptyIdentity('linked', accountId), ...own, partnerUserId: partner.id, canAccessData: true,
    subUserId: profile.role === 'sub' ? accountId : partner.id,
    domUserId: profile.role === 'dom' ? accountId : partner.id,
  };
}

/** Existing list/metric readers may query a solo account without inventing its partner. */
export function identityScopeUserIds(subUserId: string | null, domUserId: string | null): string[] {
  const ids = [...new Set([subUserId, domUserId].filter((id): id is string => !!id))];
  if (!ids.length) throw new Error('Account identity must be loaded before reading data.');
  return ids;
}

const identityProblems: Record<string, string> = {
  missing_profile: 'Choose your role to finish setting up your account.',
  invalid_role: 'Choose a valid Dom or Sub role for your account.',
  invalid_partner: 'Your partner connection could not be verified. Disconnect it before reconnecting.',
  same_role: 'The linked accounts have the same role. Disconnect before changing roles and reconnecting.',
  incomplete_partner: 'The partner connection is incomplete. Disconnect it before reconnecting.',
};

/** Validate the server's authenticated identity receipt before exposing any IDs. */
export function decodeIdentity(accountId: string, payload: unknown): IdentityState {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('The account service returned an invalid identity response.');
  const record = payload as Record<string, unknown>;
  if (record.user_id !== accountId) throw new Error('The account response does not match the signed-in account. Please retry.');
  const role = record.role === 'sub' || record.role === 'dom' ? record.role : null;
  const partnerRole = record.partner_role === 'sub' || record.partner_role === 'dom' ? record.partner_role : null;
  const partnerId = typeof record.linked_partner_id === 'string' ? record.linked_partner_id : null;
  // An owned active but malformed connection may still be unlinked. Keep its
  // server generation without turning it into a valid shared-data identity.
  const relationshipSessionId = record.relationship_status === 'active' && typeof record.participant_id === 'string' &&
    isRelationshipSessionId(record.relationship_session_id) ? record.relationship_session_id : null;
  const context = {
    relationshipSessionId,
    relationshipId: typeof record.relationship_id === 'string' ? record.relationship_id : null,
    participantId: typeof record.participant_id === 'string' ? record.participant_id : null,
    relationshipStatus: typeof record.relationship_status === 'string' ? record.relationship_status : null,
    lifecycleReady: record.lifecycle_ready === true && relationshipSessionId !== null,
    timezone: typeof record.timezone === 'string' ? record.timezone : null,
  };
  if (typeof record.status === 'string' && identityProblems[record.status]) {
    return {
      ...emptyIdentity('invalid', accountId, identityProblems[record.status]),
      ...context, currentRole: role, partnerRole, partnerUserId: partnerId, problem: record.status,
    };
  }
  if (record.status !== 'ready_solo' && record.status !== 'ready_linked') throw new Error('The account service returned an unknown identity state.');
  if (!role || (record.status === 'ready_solo' && partnerId) || (record.status === 'ready_linked' && (!partnerId || !partnerRole))) {
    throw new Error('The account service returned an incomplete identity.');
  }
  // The RPC verifies reciprocal membership; validate its role projection as well.
  const state = resolveIdentity(accountId, { id: accountId, role, linked_partner_id: partnerId },
    partnerId ? { id: partnerId, role: partnerRole, linked_partner_id: accountId } : null);
  if (!state.canAccessData || state.subUserId !== record.sub_user_id || state.domUserId !== record.dom_user_id) {
    throw new Error('The account service returned inconsistent role identities.');
  }
  if (!context.relationshipId || !context.participantId || context.relationshipStatus !== 'active') {
    throw new Error('The account service returned an incomplete relationship period.');
  }
  if (!record.permissions || typeof record.permissions !== 'object' || Array.isArray(record.permissions) ||
    Object.values(record.permissions).some(value => value !== 'dom' && value !== 'sub' && value !== 'both')) {
    throw new Error('The account service returned invalid relationship permissions.');
  }
  return {
    ...state, ...context, partnerRole, permissions: record.permissions as Record<string, PermissionChoice>,
    partnerLinkCode: state.status === 'unlinked' && typeof record.partner_link_code === 'string' ? record.partner_link_code : null,
  };
}

export function decodeLinkPreview(payload: unknown): LinkPreview {
  if (!payload || typeof payload !== 'object') throw new Error('The account service returned an invalid link preview.');
  const record = payload as Record<string, unknown>;
  if ((record.mode !== 'fresh' && record.mode !== 'continue') || typeof record.can_continue_previous !== 'boolean' ||
    (record.mode === 'fresh' && record.previous_relationship_id !== null) ||
    (record.mode === 'continue' && typeof record.previous_relationship_id !== 'string')) {
    throw new Error('The account service returned an invalid link preview.');
  }
  return { mode: record.mode, previousRelationshipId: record.previous_relationship_id as string | null, canContinuePrevious: record.can_continue_previous };
}

export function identityCacheScope(identity: IdentityState): string | null {
  return identity.canAccessData && identity.currentUserId
    ? JSON.stringify([identity.currentUserId, identity.relationshipId ?? 'solo', identity.relationshipSessionId, identity.subUserId, identity.domUserId])
    : null;
}

export function isValidTimezone(timezone: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/.test(timezone)) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function getBrowserTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone && isValidTimezone(timezone) ? timezone : null;
  } catch {
    return null;
  }
}
