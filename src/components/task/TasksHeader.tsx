
import React from 'react'; // Removed useEffect
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';

import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

// interface TasksHeaderProps { } // Removed onAddTask prop, so interface might not be needed if empty

const TasksHeader: React.FC<{}> = () => { // Updated to React.FC<{}>
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();

  const { data: subPoints, isLoading: isLoadingSubPoints } = useUserPointsQuery(subUserId);
  const { data: domPoints, isLoading: isLoadingDomPoints } = useUserDomPointsQuery(domUserId);
  const { data: subRewardTypesCount, isLoading: isLoadingSubSupply } = useSubRewardTypesCountQuery();
  const { data: domRewardTypesCount, isLoading: isLoadingDomSupply } = useDomRewardTypesCountQuery();
  
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };
  const isLoadingDisplay = isLoadingUserIds || isLoadingSubPoints || isLoadingDomPoints || isLoadingSubSupply || isLoadingDomSupply;

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      {isLoadingDisplay ? (
        <span className="text-sm text-gray-400 ml-auto">Loading points...</span>
      ) : (
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
      )}
    </div>
  );
};

export default TasksHeader;
