
import React, { useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '../../contexts/RewardsContext'; // This context is likely deprecated or unused here
import { Box, Coins } from 'lucide-react';
import { usePointsManager } from '@/data/points/usePointsManager';
// Removed: Button, Plus from lucide-react as onAddNewReward is not used here for a button

interface RewardsHeaderProps {
  onAddNewReward?: () => void; // Added optional prop
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => { // Destructure onAddNewReward
  // The useRewards context seems to be for reward supply, not points.
  // Points are now managed by usePointsManager.
  // Let's verify if totalRewardsSupply and totalDomRewardsSupply are still needed from this context
  // or if they should come from a more direct query or points manager.
  // For now, assume they are still relevant from RewardsContext, but this might need review.
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  
  const { 
    points: totalPoints, 
    domPoints, 
    isLoadingPoints, 
    refreshPoints 
  } = usePointsManager();

  useEffect(() => {
    console.log("RewardsHeader mounted, refreshing points via usePointsManager");
    refreshPoints();
  }, [refreshPoints]);

  // The `onAddNewReward` prop is passed but not used in this component's JSX.
  // The button that used to trigger it was in RewardsHeader itself.
  // Now, Rewards.tsx's RewardsHeader instance calls its own `handleAddNewReward`.
  // If a button is needed *within* RewardsHeader to trigger this, it would need to be re-added.
  // For now, simply accepting the prop fixes the TS error.

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      {/* Removed Add New Reward button from here as it's handled by AppLayout or page-level logic */}
      {isLoadingPoints ? (
         <span className="text-sm text-gray-400">Loading points...</span>
      ) : (
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
      )}
    </div>
  );
};

export default RewardsHeader;
