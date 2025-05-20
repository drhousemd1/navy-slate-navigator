
import React, { useEffect } from 'react';
import { Badge } from './badge';
import { DOMBadge } from './dom-badge';
import { Box, Coins } from 'lucide-react';
import { usePointsManager } from '@/data/points/usePointsManager';
import { supabase } from '@/integrations/supabase/client';

interface HeaderBadgesProps {
  totalRewardsSupply: number;
  totalDomRewardsSupply: number;
  className?: string;
}

export const HeaderBadges: React.FC<HeaderBadgesProps> = ({
  totalRewardsSupply,
  totalDomRewardsSupply,
  className = ''
}) => {
  // Get current user's points
  const {
    points: totalPoints,
    domPoints,
    refreshPoints
  } = usePointsManager(); // Current authenticated user's points

  // Fetch and monitor partner's points
  const [partnerPoints, setPartnerPoints] = React.useState(0);
  const [partnerDomPoints, setPartnerDomPoints] = React.useState(0);
  const [partnerId, setPartnerId] = React.useState<string | null>(null);

  // Refresh current user points
  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  // Get partner ID and set up realtime subscription
  useEffect(() => {
    const fetchPartnerInfo = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get partner ID from user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();

      if (profile?.linked_partner_id) {
        setPartnerId(profile.linked_partner_id);

        // Fetch partner's points
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('points, dom_points')
          .eq('id', profile.linked_partner_id)
          .single();

        if (partnerProfile) {
          setPartnerPoints(partnerProfile.points || 0);
          setPartnerDomPoints(partnerProfile.dom_points || 0);
        }

        // Set up realtime subscription for partner's profile updates
        const channel = supabase
          .channel('partner-profile-changes')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${profile.linked_partner_id}`
          }, (payload) => {
            setPartnerPoints(payload.new.points || 0);
            setPartnerDomPoints(payload.new.dom_points || 0);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    fetchPartnerInfo();
  }, []);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        className="text-white font-bold px-3 py-1 flex items-center gap-1"
        style={badgeStyle}
      >
        <Box className="w-3 h-3" />
        <span>{totalRewardsSupply}</span>
      </Badge>
      <Badge 
        className="text-white font-bold px-3 py-1 flex items-center gap-1"
        style={badgeStyle}
      >
        <Coins className="w-3 h-3" />
        <span>{totalPoints}</span>
      </Badge>
      <DOMBadge icon="box" value={totalDomRewardsSupply} />
      <DOMBadge icon="crown" value={domPoints} />
      
      {/* If partner exists, show their points as well */}
      {partnerId && (
        <>
          <Badge 
            className="text-white font-bold px-3 py-1 flex items-center gap-1 ml-2 border-red-500"
            style={{ ...badgeStyle, borderColor: "#ff0055" }}
          >
            <Coins className="w-3 h-3" />
            <span>{partnerPoints}</span>
          </Badge>
          <DOMBadge 
            icon="crown" 
            value={partnerDomPoints} 
            className="border-red-500"
          />
        </>
      )}
    </div>
  );
};
