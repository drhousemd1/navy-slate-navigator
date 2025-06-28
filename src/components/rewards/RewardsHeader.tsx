
import React from 'react';
import { Badge } from '../../components/ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';

import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => {
  const { subUserId } = useUserIds();

  // Use the current logged-in user's ID (subUserId) for all queries
  const { data: subPoints, refetch: refetchSubPoints } = useUserPointsQuery(subUserId);
  const { data: domPoints, refetch: refetchDomPoints } = useUserDomPointsQuery(subUserId);
  const { data: subRewardTypesCount, refetch: refetchSubCount } = useSubRewardTypesCountQuery(subUserId);
  const { data: domRewardTypesCount, refetch: refetchDomCount } = useDomRewardTypesCountQuery(subUserId);

  // Refetch all data when component mounts or when badges are clicked
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetchSubPoints();
      refetchDomPoints();
      refetchSubCount();
      refetchDomCount();
    }, 1000); // Refresh every second to catch updates quickly

    return () => clearInterval(interval);
  }, [refetchSubPoints, refetchDomPoints, refetchSubCount, refetchDomCount]);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      <div className="flex items-center gap-2">
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Box className="w-3 h-3" />
          <span>{subRewardTypesCount ?? 0}</span>
        </Badge>
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Coins className="w-3 h-3" />
          <span>{subPoints ?? 0}</span>
        </Badge>
        <DOMBadge icon="box" value={domRewardTypesCount ?? 0} />
        <DOMBadge icon="crown" value={domPoints ?? 0} />
      </div>
    </div>
  );
};

export default RewardsHeader;
