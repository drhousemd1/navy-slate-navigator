
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Box, Coins } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useRewards } from '@/contexts/RewardsContext';

const RulesHeader: React.FC = () => {
  const { totalPoints, totalRewardsSupply, refreshPointsFromDatabase } = useRewards();

  // Refresh points when component mounts - exactly like in TasksHeader
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalRewardsSupply}</span>
        </Badge>
        <Badge className="bg-cyan-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Coins className="w-3 h-3" />
          <span>{totalPoints}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RulesHeader;
