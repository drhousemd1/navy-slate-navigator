
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins } from 'lucide-react';
import { usePointsManager } from '@/data/points/usePointsManager';
import { supabase } from '@/integrations/supabase/client';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  
  const { 
    points: totalPoints, 
    domPoints, 
    refreshPoints 
  } = usePointsManager(); // Fetches for the current authenticated user by default

  // Force refresh points data on mount and when profile changes
  useEffect(() => {
    const refreshPointsData = async () => {
      try {
        console.log("RewardsHeader: Refreshing points data");
        await refreshPoints();
      } catch (error) {
        console.error("Error refreshing points in RewardsHeader:", error);
      }
    };
    
    refreshPointsData();
    
    // Also refresh when points data might change from an external source
    const channel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          refreshPointsData)
      .subscribe();
          
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshPoints]);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
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
          <span>{totalPoints}</span>
        </Badge>
        <DOMBadge icon="box" value={totalDomRewardsSupply} />
        <DOMBadge icon="crown" value={domPoints} />
      </div>
    </div>
  );
};

export default RewardsHeader;
