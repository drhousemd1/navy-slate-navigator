
import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Box, Coins } from 'lucide-react';
import { useRewardsQuery } from '@/hooks/useRewardsQuery';
import { supabase } from '@/integrations/supabase/client';

const RewardsHeader: React.FC = () => {
  const { rewards, refetchRewards } = useRewardsQuery();
  const [points, setPoints] = useState(0);
  
  // Calculate total rewards supply
  const totalRewardsSupply = rewards.reduce((total, reward) => total + reward.supply, 0);
  
  // Fetch points from profiles table
  useEffect(() => {
    const fetchPoints = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          setPoints(data.points);
        }
      }
    };
    
    fetchPoints();
  }, []);

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalRewardsSupply}</span>
        </Badge>
        <Badge className="bg-cyan-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Coins className="w-3 h-3" />
          <span>{points}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RewardsHeader;
