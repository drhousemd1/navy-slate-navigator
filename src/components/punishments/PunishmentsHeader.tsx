
import React from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
// import { usePunishments } from '@/contexts/PunishmentsContext'; // Old context
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData'; // New data hook
import RandomPunishmentSelections from './RandomPunishmentSelections';

import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const PunishmentsHeader: React.FC = () => {
  const { punishments } = usePunishmentsData(); // Using new data hook
  const { subUserId, domUserId } = useUserIds();

  const { data: subPoints } = useUserPointsQuery(subUserId);
  const { data: domPoints } = useUserDomPointsQuery(domUserId);
  const { data: subRewardTypesCount } = useSubRewardTypesCountQuery();
  const { data: domRewardTypesCount } = useDomRewardTypesCountQuery();
  
  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  // isLoadingDisplay logic removed

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
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Box className="w-3 h-3" />
          <span>{subRewardTypesCount ?? 0}</span> {/* Submissive "Supply" (Reward Types Count) */}
        </Badge>
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Coins className="w-3 h-3" />
          <span>{subPoints ?? 0}</span> {/* Submissive Points */}
        </Badge>
        <DOMBadge icon="box" value={domRewardTypesCount ?? 0} /> {/* Dominant "Supply" (Reward Types Count) */}
        <DOMBadge icon="crown" value={domPoints ?? 0} /> {/* Dominant Points */}
      </div>
      
      <RandomPunishmentSelections
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </div>
  );
};

export default PunishmentsHeader;
