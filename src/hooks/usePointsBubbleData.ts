
import { useUserIds } from '@/contexts/UserIdsContext';
import { useUserPointsQuery } from '@/data/points/useUserPointsQuery';
import { useUserDomPointsQuery } from '@/data/points/useUserDomPointsQuery';
import { useSubRewardTypesCountQuery } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { useDomRewardTypesCountQuery } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

export const usePointsBubbleData = () => {
  const { subUserId } = useUserIds();

  const { data: subPoints } = useUserPointsQuery(subUserId);
  const { data: domPoints } = useUserDomPointsQuery(subUserId);
  const { data: subRewardTypesCount } = useSubRewardTypesCountQuery(subUserId);
  const { data: domRewardTypesCount } = useDomRewardTypesCountQuery(subUserId);

  return {
    subPoints: subPoints ?? 0,
    domPoints: domPoints ?? 0,
    subRewardTypesCount: subRewardTypesCount ?? 0,
    domRewardTypesCount: domRewardTypesCount ?? 0,
  };
};
