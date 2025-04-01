
import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Box, Coins } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useRewards } from '@/contexts/RewardsContext';

const RulesHeader: React.FC = () => {
  const [totalRules, setTotalRules] = useState(0);
  const { totalPoints, totalRewardsSupply, refreshPointsFromDatabase } = useRewards();

  // Refresh points when component mounts - exactly like in TasksHeader
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // Fetch rules count when component mounts
  useEffect(() => {
    const fetchRulesData = async () => {
      try {
        // Get total count of rules
        const { count, error } = await supabase
          .from('rules')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          throw error;
        }
        
        setTotalRules(count || 0);
      } catch (err) {
        console.error('Error fetching rules data:', err);
      }
    };
    
    fetchRulesData();
  }, []);

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalRules}</span>
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
