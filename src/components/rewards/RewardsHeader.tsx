
import React from 'react';
import { Badge } from '../ui/badge';
import { Box, Coins } from 'lucide-react';
import { useRewardsQuery } from '@/hooks/useRewardsQuery';

const RewardsHeader: React.FC = () => {
  const { points, totalRewardsSupply, refetchPoints } = useRewardsQuery();

  // Refresh points when component mounts - handled by the hook now

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
