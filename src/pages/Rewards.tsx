
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import { useSyncManager } from '@/hooks/useSyncManager';

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { rewards, isLoading, handleSaveReward, handleDeleteReward } = useRewards();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<any>(undefined);
  
  // Use the enhanced sync manager with forced sync on page load
  const { syncNow, isSyncing } = useSyncManager({ 
    intervalMs: 30000, 
    enabled: true,
    forceSync: true // Force sync when component mounts
  });
  
  // Sync on initial render with proper version checking
  useEffect(() => {
    console.log('[RewardsPage] Initial mount, forcing data synchronization');
    // Set a flag to track this page view for version checking
    localStorage.setItem('current-page', 'rewards');
    // Force a sync on initial load completion
    syncNow();
    
    return () => {
      // Clean up
      localStorage.removeItem('current-page');
    };
  }, [syncNow]);
  
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
  }, [contentRef]);
  
  return (
    <div className="p-4 pt-6">
      <RewardsHeader />
      
      <RewardsList
        onEdit={handleEditReward}
      />
      
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        rewardData={rewardBeingEdited}
        onSave={async (data) => {
          try {
            // Get the index from the rewardBeingEdited if it exists
            const index = rewardBeingEdited?.index !== undefined ? rewardBeingEdited.index : null;
            await handleSaveReward(data, index);
            setIsEditorOpen(false);
            // Force a sync after saving a reward
            syncNow();
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
            // Force a sync after deleting a reward
            syncNow();
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
