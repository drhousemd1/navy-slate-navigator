
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '@/contexts/RewardsContext';
import { Box, Coins, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import { usePunishments } from '@/contexts/PunishmentsContext';
import RandomPunishmentSelections from './RandomPunishmentSelections';
import { usePointsManager } from '@/data/points/usePointsManager';
import { supabase } from '@/integrations/supabase/client';

const PunishmentsHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  const { punishments } = usePunishments();
  
  const { 
    points: totalPoints, 
    domPoints, 
    refreshPoints,
    profileId // Get profileId from usePointsManager
  } = usePointsManager(); 

  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

  useEffect(() => {
    const refreshPointsData = async () => {
      try {
        console.log("PunishmentsHeader: Refreshing points data");
        await refreshPoints();
      } catch (error) {
        console.error("Error refreshing points in PunishmentsHeader:", error);
      }
    };
    
    refreshPointsData(); // Initial fetch

    let profileChangesChannel: any; // Declare channel variable

    if (profileId) { // Only subscribe if profileId is available
      profileChangesChannel = supabase
        .channel(`profile_changes_punishments_header_${profileId}`) // Unique channel name
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${profileId}` // Filter for current user's profile
          },
          (payload) => {
            console.log("PunishmentsHeader: Profile change detected via Supabase realtime", payload);
            refreshPointsData();
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`PunishmentsHeader: Subscribed to profile changes for ${profileId}`);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`PunishmentsHeader: Subscription error for ${profileId}:`, err);
          }
        });
    }
          
    return () => {
      if (profileChangesChannel) {
        supabase.removeChannel(profileChangesChannel);
        console.log(`PunishmentsHeader: Unsubscribed from profile changes for ${profileId}`);
      }
    };
  }, [refreshPoints, profileId]); // Add profileId to dependency array

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-2">Punishments</h1>
      <Button 
        variant="outline" 
        className="relative mr-auto flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white border-none h-8 px-3 text-sm font-medium rounded-md"
        onClick={() => setIsRandomSelectorOpen(true)}
        disabled={punishments.length === 0}
      >
        <Shuffle className="w-4 h-4" />
        Random
      </Button>
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
      
      <RandomPunishmentSelections
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </div>
  );
};

export default PunishmentsHeader;
