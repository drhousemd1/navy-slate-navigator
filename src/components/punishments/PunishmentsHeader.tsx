
import React from 'react';
import { Badge } from '../ui/badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import RandomPunishmentSelector from './RandomPunishmentSelector';
import { usePunishmentsQuery } from '@/hooks/usePunishmentsQuery';

const PunishmentsHeader: React.FC = () => {
  const { totalPoints, totalRewardsSupply } = useRewards();
  const { punishments } = usePunishmentsQuery();
  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

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
        <Badge className="bg-blue-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalRewardsSupply}</span>
        </Badge>
        <Badge className="bg-cyan-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Coins className="w-3 h-3" />
          <span>{totalPoints}</span>
        </Badge>
      </div>
      
      <RandomPunishmentSelector 
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </div>
  );
};

export default PunishmentsHeader;
