
import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Shuffle } from 'lucide-react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import RandomPunishmentSelections from './RandomPunishmentSelections';
import { useRewards } from '@/contexts/RewardsContext';
import { usePointsManager } from '@/data/points/usePointsManager';
import { HeaderBadges } from '../ui/header-badges';

const PunishmentsHeader: React.FC = () => {
  const { punishments } = usePunishments();
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  const { refreshPoints } = usePointsManager();
  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

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
      
      <HeaderBadges 
        totalRewardsSupply={totalRewardsSupply}
        totalDomRewardsSupply={totalDomRewardsSupply}
      />
      
      <RandomPunishmentSelections
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </div>
  );
};

export default PunishmentsHeader;
