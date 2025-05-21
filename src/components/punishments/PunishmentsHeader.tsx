
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import { usePunishments } from '@/contexts/PunishmentsContext'; // Still needed for RandomPunishmentSelections
import RandomPunishmentSelections from './RandomPunishmentSelections';

import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const PunishmentsHeader: React.FC = () => {
  const { punishments } = usePunishments(); // For random selector disabling
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();

  const { data: subPoints, isLoading: isLoadingSubPoints } = useUserPointsQuery(subUserId);
  const { data: domPoints, isLoading: isLoadingDomPoints } = useUserDomPointsQuery(domUserId);
  const { data: subRewardTypesCount, isLoading: isLoadingSubSupply } = useSubRewardTypesCountQuery();
  const { data: domRewardTypesCount, isLoading: isLoadingDomSupply } = useDomRewardTypesCountQuery();
  
  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

  // No specific useEffect for point refresh needed here anymore, relying on query staleness and invalidation.

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  const isLoadingDisplay = isLoadingUserIds || isLoadingSubPoints || isLoadingDomPoints || isLoadingSubSupply || isLoadingDomSupply;

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
      {isLoadingDisplay ? (
        <span className="text-sm text-gray-400">Loading points...</span>
      ) : (
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
      )}
      
      <RandomPunishmentSelections
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </div>
  );
};

export default PunishmentsHeader;
