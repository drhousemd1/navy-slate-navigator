
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
  const { rewards, isLoading, handleSaveReward, handleDeleteReward, refetchRewards } = useRewards();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<any>(undefined);
  
  // Use the sync manager to keep data in sync - add enabled parameter
  const { syncNow } = useSyncManager({ intervalMs: 30000, enabled: true });
  
  // Force data refresh on mount
  useEffect(() => {
    console.log('RewardsContent: Forcing initial data refresh');
    syncNow();
    refetchRewards().catch(err => 
      console.error('Error refreshing rewards:', err)
    );
  }, [refetchRewards, syncNow]);
  
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
            
            // Save reward
            await handleSaveReward(data, index);
            setIsEditorOpen(false);
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
