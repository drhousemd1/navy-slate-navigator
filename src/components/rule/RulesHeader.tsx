
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useRewards } from '@/contexts/RewardsContext';

const RulesHeader: React.FC = () => {
  const { totalPoints, totalRewardsSupply, totalDomRewardsSupply, domPoints = 0, refreshPointsFromDatabase } = useRewards();

  // Refresh points when component mounts - exactly like in TasksHeader
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // Style for badges - black background with cyan border
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
          <span>{totalPoints}</span>
        </Badge>
        <DOMBadge icon="box" value={totalDomRewardsSupply} />
        <DOMBadge icon="crown" value={domPoints} />
      </div>
    </div>
  );
};

export default RulesHeader;
