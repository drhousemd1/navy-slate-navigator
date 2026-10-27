import { describe, expect, it } from 'vitest';
import { emptyIdentity, identityScopeUserIds, resolveIdentity, decodeIdentity, identityCacheScope, decodeLinkPreview, type IdentityProfile } from '@/lib/identity';

const sub: IdentityProfile = { id: 'sub-account', role: 'sub', linked_partner_id: 'dom-account' };
const dom: IdentityProfile = { id: 'dom-account', role: 'dom', linked_partner_id: 'sub-account' };

describe('authoritative relationship resolution', () => {
  it('resolves the same actual role holders from either linked account', () => {
    for (const [self, partner] of [[sub, dom], [dom, sub]]) {
      expect(resolveIdentity(self.id, self, partner)).toMatchObject({
        status: 'linked', currentUserId: self.id, currentRole: self.role,
        partnerUserId: partner.id, subUserId: sub.id, domUserId: dom.id, canAccessData: true,
      });
    }
  });

  it.each([sub, dom])('keeps a solo $role account in its real role and own data scope', profile => {
    const state = resolveIdentity(profile.id, { ...profile, linked_partner_id: null });
    expect(state.status).toBe('unlinked');
    expect(state.partnerUserId).toBeNull();
    expect(state.subUserId).toBe(profile.role === 'sub' ? profile.id : null);
    expect(state.domUserId).toBe(profile.role === 'dom' ? profile.id : null);
    expect(identityScopeUserIds(state.subUserId, state.domUserId)).toEqual([profile.id]);
  });

  it.each([
    ['missing profile', null, null],
    ['different account profile', dom, sub],
    ['unknown own role', { ...sub, role: 'admin' }, dom],
    ['self link', { ...sub, linked_partner_id: sub.id }, sub],
    ['missing partner', sub, null],
    ['different partner', sub, { ...dom, id: 'unrelated-account' }],
    ['one-sided link', sub, { ...dom, linked_partner_id: null }],
    ['partner linked elsewhere', sub, { ...dom, linked_partner_id: 'unrelated-account' }],
    ['unknown partner role', sub, { ...dom, role: null }],
    ['same role', sub, { ...dom, role: 'sub' }],
  ] as const)('blocks %s without assigning role IDs', (_case, profile, partner) => {
    expect(resolveIdentity(sub.id, profile, partner)).toMatchObject({
      status: 'invalid', canAccessData: false, subUserId: null, domUserId: null,
    });
  });

  it('keeps a load failure distinct from a confirmed unlinked account', () => {
    expect(emptyIdentity('error', sub.id, 'Could not load account')).toMatchObject({
      status: 'error', canAccessData: false, subUserId: null, domUserId: null,
    });
    expect(() => identityScopeUserIds(null, null)).toThrow('identity must be loaded');
  });
});

describe('server identity receipts and relationship namespaces', () => {
  const receipt = {
    status: 'ready_solo', user_id: 'dom-account', role: 'dom', linked_partner_id: null, partner_role: null,
    sub_user_id: null, dom_user_id: 'dom-account', relationship_id: 'period-1', relationship_status: 'active', relationship_session_id: '00000000-0000-4000-8000-000000000090',
    participant_id: 'member-1', permissions: { task_complete: 'both' }, lifecycle_ready: false,
    timezone: 'America/Boise', partner_link_code: null,
  };
  it('preserves server lifecycle, timezone and permissions without granting default authority', () => {
    expect(decodeIdentity('dom-account', receipt)).toMatchObject({ status: 'unlinked', domUserId: 'dom-account', subUserId: null,
      lifecycleReady: false, timezone: 'America/Boise', permissions: { task_complete: 'both' } });
  });
  it.each([
    { user_id: 'other-account' }, { status: 'unknown' }, { sub_user_id: 'dom-account' },
    { relationship_id: null }, { relationship_status: 'archived' }, { participant_id: null },
    { permissions: { task_complete: 'anyone' } }, { status: 'ready_linked', linked_partner_id: null },
  ])('rejects a malformed or foreign receipt: %o', change => {
    expect(() => decodeIdentity('dom-account', { ...receipt, ...change })).toThrow();
  });
  it('keeps an invalid relationship repairable without exposing role IDs or claiming solo', () => {
    expect(decodeIdentity('dom-account', { ...receipt, status: 'incomplete_partner', linked_partner_id: 'sub-account', lifecycle_ready: true }))
      .toMatchObject({ status: 'invalid', canAccessData: false, subUserId: null, domUserId: null, relationshipId: 'period-1', lifecycleReady: true });
  });
  it('uses a different cache namespace for a fresh period even when both people are unchanged', () => {
    const identity = decodeIdentity('dom-account', receipt);
    expect(identityCacheScope(identity)).not.toBe(identityCacheScope({ ...identity, relationshipId: 'period-2' }));
  });
  it.each([undefined, null, 'not-a-uuid'])('never turns an absent or malformed generation into write authority: %s', session => {
    const state = decodeIdentity('dom-account', { ...receipt, relationship_session_id: session, lifecycle_ready: true });
    expect(state.relationshipSessionId).toBeNull(); expect(state.lifecycleReady).toBe(false);
  });
  it('preserves an owned active generation for malformed-link repair without exposing shared role IDs', () => {
    const state = decodeIdentity('dom-account', { ...receipt, status: 'incomplete_partner', lifecycle_ready: true });
    expect(state).toMatchObject({ status: 'invalid', canAccessData: false, relationshipSessionId: receipt.relationship_session_id, lifecycleReady: true, subUserId: null, domUserId: null });
    expect(decodeIdentity('dom-account', { ...receipt, status: 'incomplete_partner', relationship_status: 'archived' }).relationshipSessionId).toBeNull();
  });
  it('separates cache identities when Continue rotates only the relationship session', () => {
    const first = decodeIdentity('dom-account', receipt);
    expect(identityCacheScope(first)).not.toBe(identityCacheScope({ ...first, relationshipSessionId: '00000000-0000-4000-8000-000000000091' }));
  });
  it('requires the exact previous period in a continuation preview', () => {
    expect(decodeLinkPreview({ mode: 'continue', previous_relationship_id: 'old-period', can_continue_previous: true }))
      .toEqual({ mode: 'continue', previousRelationshipId: 'old-period', canContinuePrevious: true });
    expect(() => decodeLinkPreview({ mode: 'continue', previous_relationship_id: null, can_continue_previous: true })).toThrow();
  });
});
