import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import { useSyncManager } from '@/data/sync/useSyncManager';
import { usePreloadRewards } from "@/data/preload/usePreloadRewards";

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  usePreloadRewards(); // Called directly, hook handles its own effect.
  const { rewards, isLoading, handleSaveReward, handleDeleteReward } = useRewards();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<any>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Use the sync manager to keep data in sync - add enabled parameter
  const { syncNow } = useSyncManager({ intervalMs: 30000, enabled: true });
  
  // Sync on initial render only
  useEffect(() => {
    // Force a sync on initial load completion - only once
    syncNow();
  }, [syncNow]); // Added syncNow to dependency array
  
  // Set isInitialLoad to false once rewards have loaded
  useEffect(() => {
    if (!isLoading && rewards) {
      setIsInitialLoad(false);
    }
  }, [isLoading, rewards]);
  
  const handleAddNewReward = () => {
    setRewardBeingEdited(undefined);
    setIsEditorOpen(true);
  };
  
  const handleEditReward = (index: number) => {
    setRewardBeingEdited({
      ...rewards[index],
      index
    });
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
    contentRef.current = {
      handleAddNewReward
    };
    
    return () => {
      contentRef.current = {};
    };
  }, [contentRef]); // Removed handleAddNewReward from dependency array as it's stable if defined outside
  
  return (
    <div className="p-4 pt-6">
      <RewardsHeader />
      
      {!isInitialLoad && (
        <RewardsList
          onEdit={handleEditReward}
        />
      )}
      
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        rewardData={rewardBeingEdited}
        onSave={async (data) => {
          try {
            // Get the index from the rewardBeingEdited if it exists
            const index = rewardBeingEdited?.index !== undefined ? rewardBeingEdited.index : null;
            
            // Save reward without forcing immediate sync
            await handleSaveReward(data, index);
          } catch (error) {
            console.error("Error saving reward:", error);
          }
        }}
        onDelete={async (id) => {
          try {
            // Fix: Convert both sides to string for comparison to ensure type consistency
            const index = rewards.findIndex(r => String(r.id) === String(id));
            if (index !== -1) {
              await handleDeleteReward(index);
            }
            setIsEditorOpen(false);
            
            // Sync is still useful after delete, but delay it slightly
            setTimeout(syncNow, 500);
          } catch (error) {
            console.error("Error deleting reward:", error);
          }
        }}
      />
    </div>
  );
};

const Rewards: React.FC = () => {
  const contentRef = useRef<{ handleAddNewReward?: () => void }>({});
  usePreloadRewards(); // Called directly, hook handles its own effect.
  
  // Removed redundant useEffect that was calling preloadRewards()

  const handleAddNewReward = () => {
    if (contentRef.current.handleAddNewReward) {
      contentRef.current.handleAddNewReward();
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddNewReward}>
      <RewardsProvider>
        <RewardsContent contentRef={contentRef} />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rewards;
