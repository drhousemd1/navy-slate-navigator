
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins, BookOpen } from 'lucide-react';
import { useProfilePoints } from "@/data/queries/useProfilePoints";
import { Link } from 'react-router-dom';

const TasksHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply, refreshPointsFromDatabase } = useRewards();
  const { data: profile } = useProfilePoints();
  const totalPoints = profile?.points ?? 0;
  const domPoints = profile?.dom_points ?? 0;

  // Refresh points when component mounts
  useEffect(() => {
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // Style for badges - black background with cyan border
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
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
        <Link 
          to="/app-guide" 
          title="App Guide" 
          className="text-white hover:text-cyan-400 ml-2 p-1.5 rounded-md flex items-center justify-center transition-colors"
        >
          <BookOpen className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
};

export default TasksHeader;
