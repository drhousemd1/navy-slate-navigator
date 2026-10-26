import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth';
import { Copy, Users, Unlink } from 'lucide-react';
import { toastManager } from '@/lib/toastManager';
import type { LinkPreview } from '@/lib/identity';

const PartnerLinkingSection: React.FC = () => {
  const { generateLinkCode, previewPartnerCode, linkToPartner, unlinkFromPartner,
    relationshipIdentity: identity, partnerLinkingLoading, partnerLinkingAvailable } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [review, setReview] = useState<{ code: string; consent: LinkPreview; scope: string } | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const scope = JSON.stringify([identity.currentUserId, identity.relationshipId]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const isLinked = identity.status === 'linked';
  const linkCode = identity.partnerLinkCode;
  const disabled = partnerLinkingLoading || !partnerLinkingAvailable;

  useEffect(() => {
    setPartnerCode('');
    setReview(null);
    setConfirmUnlink(false);
  }, [scope]);

  const handleCopyCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      toastManager.success('Copied!', 'Link code copied to clipboard.');
    } catch {
      toastManager.error('Copy unavailable', 'Select the code and copy it manually.');
    }
  };

  const handleReview = async () => {
    const code = partnerCode.trim().toUpperCase();
    const consent = await previewPartnerCode(code);
    if (consent && currentScope.current === scope) setReview({ code, consent, scope });
  };

  const confirmConnection = async () => {
    if (!review || review.scope !== currentScope.current) return;
    if (await linkToPartner(review.code, review.consent)) {
      setReview(null);
      setPartnerCode('');
    }
  };

  return (
    <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Users className="w-5 h-5" />Partner Linking</h2>
      {isLinked ? (
        <div>
          <Label className="block text-sm font-medium text-gray-300 mb-2">Partner Status</Label>
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded space-y-3">
            <p className="font-medium">✓ Connected to Partner</p>
            <p className="text-sm">Your partner is the {identity.partnerRole === 'dom' ? 'Dom' : 'Sub'} in this connection.</p>
            <Button onClick={() => setConfirmUnlink(true)} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/50" disabled={disabled}>
              <Unlink className="w-4 h-4 mr-2" />Unlink
            </Button>
            {confirmUnlink && <div className="space-y-3" role="group" aria-label="Confirm disconnection">
              <p className="text-sm">Disconnect from this partner? This ends the current shared period and archives its history. A later connection needs a new invitation and agreement to start fresh or continue.</p>
              <div className="flex gap-2">
                <Button disabled={disabled} onClick={() => void unlinkFromPartner()} variant="destructive">Confirm disconnect</Button>
                <Button disabled={partnerLinkingLoading} onClick={() => setConfirmUnlink(false)} variant="outline">Cancel</Button>
              </div>
            </div>}
          </div>
        </div>
      ) : identity.status === 'unlinked' ? <>
        <div>
          <Label htmlFor="yourLinkCode" className="block text-sm font-medium text-gray-300 mb-2">Your Link Code</Label>
          <p className="text-sm text-gray-400 mb-3">Invite your partner to start a fresh shared period. Previous relationship history and balances are not imported.</p>
          <div className="flex gap-2">
            {linkCode && <>
              <Input id="yourLinkCode" value={linkCode} readOnly className="min-w-0 bg-navy border-light-navy font-mono" />
              <Button onClick={() => void handleCopyCode()} aria-label="Copy link code" variant="outline" className="border-cyan-500 text-cyan-400"><Copy className="w-4 h-4" /></Button>
            </>}
            <Button onClick={() => void generateLinkCode('fresh', null)} className="bg-cyan-600 hover:bg-cyan-700" disabled={disabled}>
              {linkCode ? 'Replace Code' : 'Generate Link Code'}
            </Button>
          </div>
          {linkCode && <p className="text-xs text-gray-400 mt-2">Replacing this code makes the old invitation unusable.</p>}
        </div>
        <div>
          <Label htmlFor="partnerCode" className="block text-sm font-medium text-gray-300 mb-2">Connect to Partner</Label>
          <p className="text-sm text-gray-400 mb-3">Enter your partner’s code, then review the connection before accepting.</p>
          <div className="flex gap-2">
            <Input id="partnerCode" value={partnerCode} onChange={event => { setPartnerCode(event.target.value.toUpperCase()); setReview(null); }} className="min-w-0 bg-navy border-light-navy font-mono" placeholder="Enter partner’s code" maxLength={32} disabled={disabled} autoComplete="off" />
            <Button onClick={() => void handleReview()} className="bg-green-600 hover:bg-green-700" disabled={disabled || partnerCode.trim().length !== 32}>Review</Button>
          </div>
          {review && review.scope === scope && <div className="mt-4 space-y-3 rounded border border-light-navy bg-navy p-4" role="group" aria-label="Review partner connection">
            <p className="text-sm text-gray-300">{review.consent.mode === 'continue'
              ? 'Your previous partner has invited you to continue the same archived relationship period, including its history and saved balances. Accept only if you want to resume that period together.'
              : 'Your partner has invited you to start fresh. This creates a new shared period with zero balances; previous relationship history remains separate.'}</p>
            {review.consent.mode === 'fresh' && review.consent.canContinuePrevious && <p className="text-sm text-gray-400">You have a previous period together. Continuing it requires a continuation invitation instead of this fresh invitation.</p>}
            <div className="flex gap-2">
              <Button disabled={disabled} onClick={() => void confirmConnection()} className="bg-green-600 hover:bg-green-700">{review.consent.mode === 'continue' ? 'Agree and continue' : 'Agree and start fresh'}</Button>
              <Button disabled={partnerLinkingLoading} variant="outline" onClick={() => setReview(null)}>Cancel</Button>
            </div>
          </div>}
        </div>
      </> : <p role="status" className="text-sm text-gray-300">Load your account connection before managing a partner.</p>}
      {!partnerLinkingAvailable && <p role="status" className="rounded border border-light-navy bg-navy p-3 text-sm text-gray-300">Partner changes are temporarily unavailable while relationship history and privacy are upgraded. Your current connection and existing data are unchanged.</p>}
      <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded">
        <p className="text-sm"><strong>How it works:</strong> Connected partners share tasks, rules, rewards, and progress for their current relationship. Each person keeps their actual Dom or Sub role.</p>
      </div>
    </div>
  );
};

export default PartnerLinkingSection;
