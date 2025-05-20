
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';
import { useRewards } from '@/contexts/RewardsContext';
import { usePointsManager } from '@/data/points/usePointsManager';
import { supabase } from '@/integrations/supabase/client';

const RulesHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  const { 
    points: totalPoints, 
    domPoints, 
    refreshPoints,
    profileId // Get profileId from usePointsManager for targeted subscription
  } = usePointsManager(); 

  useEffect(() => {
    const refreshPointsData = async () => {
      try {
        console.log("RulesHeader: Refreshing points data");
        await refreshPoints();
      } catch (error) {
        console.error("Error refreshing points in RulesHeader:", error);
      }
    };
    
    refreshPointsData(); // Initial fetch
    
    let profileChangesChannel: any; // Declare channel variable

    if (profileId) { // Only subscribe if profileId is available
      profileChangesChannel = supabase
        .channel(`profile_changes_rules_header_${profileId}`) // Unique channel name
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${profileId}` // Filter for current user's profile
          },
          (payload) => {
            console.log("RulesHeader: Profile change detected via Supabase realtime", payload);
            refreshPointsData();
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`RulesHeader: Subscribed to profile changes for ${profileId}`);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`RulesHeader: Subscription error for ${profileId}:`, err);
          }
        });
    }
          
    return () => {
      if (profileChangesChannel) {
        supabase.removeChannel(profileChangesChannel);
        console.log(`RulesHeader: Unsubscribed from profile changes for ${profileId}`);
      }
    };
  }, [refreshPoints, profileId]); // Add profileId to dependency array

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      <div className="flex items-center gap-2">
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
          <span>{totalPoints ?? 0}</span> {/* Ensure points are not undefined */}
        </Badge>
        <DOMBadge icon="box" value={totalDomRewardsSupply} />
        <DOMBadge icon="crown" value={domPoints ?? 0} /> {/* Ensure points are not undefined */}
      </div>
    </div>
  );
};

export default RulesHeader;
