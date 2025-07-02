
import React from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';
import { usePointsBubbleData } from '@/hooks/usePointsBubbleData';

const PointsBubbles: React.FC = () => {
  const { subPoints, domPoints, subRewardTypesCount, domRewardTypesCount } = usePointsBubbleData();

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        className="text-white font-bold px-3 py-1 flex items-center gap-1"
        style={badgeStyle}
      >
        <Box className="w-3 h-3" />
        <span>{subRewardTypesCount}</span>
      </Badge>
      <Badge 
        className="text-white font-bold px-3 py-1 flex items-center gap-1"
        style={badgeStyle}
      >
        <Coins className="w-3 h-3" />
        <span>{subPoints}</span>
      </Badge>
      <DOMBadge icon="box" value={domRewardTypesCount} />
      <DOMBadge icon="crown" value={domPoints} />
    </div>
  );
};

export default PointsBubbles;
