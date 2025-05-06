
import React, { useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins, Crown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';

const RewardsHeader: React.FC = () => {
  const { totalPoints, totalRewardsSupply, totalDomRewardsSupply, domPoints = 0, refreshPointsFromDatabase } = useRewards();
  const queryClient = useQueryClient();

  // Refresh points when component mounts with improved version checking
  useEffect(() => {
    console.log("RewardsHeader mounted, refreshing points from database");
    
    // Check last refresh time to avoid excessive refreshes
    const lastRefreshTime = localStorage.getItem('rewards-points-refresh-time');
    const now = Date.now();
    
    if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > 5000) {
      // If no refresh in last 5 seconds, force a refresh
      refreshPointsFromDatabase().then(() => {
        localStorage.setItem('rewards-points-refresh-time', now.toString());
      });
    } else {
      console.log("Points were refreshed recently, using cached data");
      
      // Still invalidate cached data to ensure we get fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
    }
  }, [refreshPointsFromDatabase, queryClient]);

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
          <span>{totalPoints}</span>
        </Badge>
        <Badge className="bg-red-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalDomRewardsSupply}</span>
        </Badge>
        <Badge className="bg-red-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Crown className="w-3 h-3" />
          <span>{domPoints}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RewardsHeader;
