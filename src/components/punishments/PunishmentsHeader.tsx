
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '@/contexts/RewardsContext';
import { Box, Coins, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import { usePunishments } from '@/contexts/PunishmentsContext';
import RandomPunishmentSelections from './RandomPunishmentSelections';
import { usePointsManager } from '@/data/points/usePointsManager';

const PunishmentsHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  const { punishments } = usePunishments();
  
  const { 
    points: totalPoints, 
    domPoints, 
    // isLoadingPoints, // No longer used for conditional rendering here
    refreshPoints 
  } = usePointsManager(); // Fetches for the current authenticated user by default

  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

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
      {/* Badges are now always rendered. isLoadingPoints is handled internally by usePointsManager returning 0 until loaded. */}
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
      
      <RandomPunishmentSelections
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </div>
  );
};

export default PunishmentsHeader;
