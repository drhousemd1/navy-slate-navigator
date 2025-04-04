
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Box, Coins, Plus } from 'lucide-react';
import { useRewards } from '@/contexts/RewardsContext';
import { Button } from '@/components/ui/button';

interface RulesHeaderProps {
  onAddRule: () => void;
}

const RulesHeader: React.FC<RulesHeaderProps> = ({ onAddRule }) => {
  const { totalPoints, totalRewardsSupply, refreshPointsFromDatabase } = useRewards();

  // Refresh points when component mounts
  React.useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
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
        <Button
          onClick={onAddRule}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 h-8 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span className="text-sm">Add Rule</span>
        </Button>
      </div>
    </div>
  );
};

export default RulesHeader;
