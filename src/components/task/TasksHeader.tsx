
import React from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';

import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const TasksHeader: React.FC<{}> = () => {
  const { subUserId, domUserId } = useUserIds(); // Removed isLoadingUserIds as it's not directly used for conditional rendering here

  const { data: subPoints } = useUserPointsQuery(subUserId); // Removed isLoading flags, rely on ?? 0
  const { data: domPoints } = useUserDomPointsQuery(domUserId);
  const { data: subRewardTypesCount } = useSubRewardTypesCountQuery();
  const { data: domRewardTypesCount } = useDomRewardTypesCountQuery();
  
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };
  // isLoadingDisplay logic removed as per requirement to always show badges

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      <div className="flex items-center gap-2 ml-auto">
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

export default TasksHeader;
