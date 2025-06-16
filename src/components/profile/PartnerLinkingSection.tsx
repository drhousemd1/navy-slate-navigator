
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth';
import { Copy, Users, Unlink, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PartnerLinkingSection: React.FC = () => {
  const { 
    generateLinkCode, 
    linkToPartner, 
    unlinkFromPartner, 
    getLinkedPartnerInfo,
    getCurrentLinkCode,
    getLinkedPartnerId,
    partnerLinkingLoading 
  } = useAuth();
  
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [linkedPartner, setLinkedPartner] = useState<{ email?: string } | null>(null);
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    // Initialize component state
    const currentCode = getCurrentLinkCode();
    const partnerId = getLinkedPartnerId();
    
    setLinkCode(currentCode);
    setIsLinked(!!partnerId);
    
    if (partnerId) {
      getLinkedPartnerInfo().then(info => {
        setLinkedPartner(info);
      });
    }
  }, []);

  const handleGenerateCode = async () => {
    const newCode = await generateLinkCode();
    if (newCode) {
      setLinkCode(newCode);
    }
  };

  const handleCopyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      toast({ title: 'Copied!', description: 'Link code copied to clipboard.' });
    }
  };

  const handleLinkToPartner = async () => {
    if (!partnerCode.trim()) {
      toast({ title: 'Error', description: 'Please enter a link code.', variant: 'destructive' });
      return;
    }

    const success = await linkToPartner(partnerCode);
    if (success) {
      setPartnerCode('');
      setIsLinked(true);
      // Refresh partner info
      const info = await getLinkedPartnerInfo();
      setLinkedPartner(info);
    }
  };

  const handleUnlink = async () => {
    const success = await unlinkFromPartner();
    if (success) {
      setIsLinked(false);
      setLinkedPartner(null);
    }
  };

  return (
    <div className="space-y-6 border-t border-light-navy pt-8 mt-8">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Users className="w-5 h-5" />
        Partner Linking
      </h2>

      {/* Current Link Code Section */}
      <div>
        <Label className="block text-sm font-medium text-gray-300 mb-2">Your Link Code</Label>
        <p className="text-sm text-gray-400 mb-3">Share this code with your partner to connect your accounts.</p>
        <div className="flex space-x-2">
          {linkCode ? (
            <>
              <Input
                value={linkCode}
                readOnly
                className="bg-navy border-light-navy focus:ring-cyan-500 focus:border-cyan-500 font-mono"
              />
              <Button onClick={handleCopyCode} variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-900/50">
                <Copy className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleGenerateCode} 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={partnerLinkingLoading}
            >
              {partnerLinkingLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                'Generate Link Code'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Link to Partner Section */}
      {!isLinked ? (
        <div>
          <Label htmlFor="partnerCode" className="block text-sm font-medium text-gray-300 mb-2">
            Connect to Partner
          </Label>
          <p className="text-sm text-gray-400 mb-3">Enter your partner's link code to connect your accounts.</p>
          <div className="flex space-x-2">
            <Input
              id="partnerCode"
              type="text"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              className="bg-navy border-light-navy focus:ring-cyan-500 focus:border-cyan-500 font-mono"
              placeholder="Enter partner's code"
              maxLength={8}
            />
            <Button 
              onClick={handleLinkToPartner}
              className="bg-green-600 hover:bg-green-700"
              disabled={partnerLinkingLoading || !partnerCode.trim()}
            >
              {partnerLinkingLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                'Link'
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* Linked Partner Status */
        <div>
          <Label className="block text-sm font-medium text-gray-300 mb-2">Partner Status</Label>
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">✓ Connected to Partner</p>
                <p className="text-sm text-green-400">
                  {linkedPartner?.email ? `Connected to: ${linkedPartner.email}` : 'Successfully linked to your partner'}
                </p>
              </div>
              <Button 
                onClick={handleUnlink}
                variant="ghost" 
                className="text-red-400 hover:text-red-300 hover:bg-red-900/50"
                disabled={partnerLinkingLoading}
              >
                <Unlink className="w-4 h-4 mr-2" />
                Unlink
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>How it works:</strong> When you link with a partner, you'll share access to each other's tasks, 
          rules, rewards, and points. This allows for collaborative goal tracking and accountability.
        </p>
      </div>
    </div>
  );
};

export default PartnerLinkingSection;
