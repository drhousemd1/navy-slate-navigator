/**
 * DO NOT REPLICATE LOGIC OUTSIDE THIS FILE.
 * All fetching, mutation, sync, and cache logic must live in centralized hooks only.
 */

import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import { useSyncManager } from '@/data/sync/useSyncManager';
import { usePreloadRewards } from "@/data/preload/usePreloadRewards";

// Preload rewards data from IndexedDB before component renders
usePreloadRewards()();

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
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
  }, []);
  
  // Add consistent short timeout for initial rendering effect
  useEffect(() => {
    // Add small timeout to ensure smooth transition
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 200); // Match timing used in Punishments page
    
    return () => clearTimeout(timer);
  }, []);
  
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
  
  // Only show loader on initial load when no cached data
  const showLoader = isInitialLoad && isLoading && (!rewards || rewards.length === 0);
  
  // Show loading state when appropriate
  if (showLoader) {
    return (
      <div className="p-4 pt-6 flex flex-col items-center justify-center h-[80vh]">
        <p className="text-light-navy">Loading rewards...</p>
      </div>
    );
  }
  
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
