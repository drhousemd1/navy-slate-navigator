
import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins, Wifi, WifiOff } from 'lucide-react';
import { useProfilePoints } from "@/data/queries/useProfilePoints";

const TasksHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply, refreshPointsFromDatabase } = useRewards();
  const { data: profile } = useProfilePoints();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const totalPoints = profile?.points ?? 0;
  const domPoints = profile?.dom_points ?? 0;

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh points when component mounts
  useEffect(() => {
    try {
      refreshPointsFromDatabase();
    } catch (error) {
      console.error("Failed to refresh points:", error);
      // Continue without failing if points refresh fails
    }
  }, [refreshPointsFromDatabase]);

  // Style for badges - black background with cyan border
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex flex-col space-y-2 mb-6">
      <div className="flex items-center">
        <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
        <div className="flex items-center gap-1 mr-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-500" />
          )}
        </div>
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
      </div>
    </div>
  );
};

export default TasksHeader;
