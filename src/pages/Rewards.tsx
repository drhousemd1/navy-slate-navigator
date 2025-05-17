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
import RewardCardSkeleton from '@/components/rewards/RewardCardSkeleton';
import { Award } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Preload rewards data from IndexedDB before component renders
usePreloadRewards()();

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { rewards, isLoading, handleSaveReward, handleDeleteReward } = useRewards();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<any>(undefined);
  
  const { syncNow } = useSyncManager({ intervalMs: 30000, enabled: true });
  
  useEffect(() => {
    syncNow();
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
  }, [contentRef, handleAddNewReward]);
  
  const renderContent = () => {
    if (isLoading && rewards.length === 0) {
      return (
        <div className="space-y-4 mt-4">
          <RewardCardSkeleton />
          <RewardCardSkeleton />
          <RewardCardSkeleton />
        </div>
      );
    }

    if (!isLoading && rewards.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Award className="h-16 w-16 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Rewards Available</h3>
          <p className="text-gray-400 mb-4">Create your first reward to motivate and acknowledge achievements!</p>
          <button
            onClick={handleAddNewReward}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition-colors"
          >
            Create Reward
          </button>
        </div>
      );
    }

    return (
      <RewardsList
        onEdit={handleEditReward}
      />
    );
  };

  return (
    <div className="p-4 pt-6">
      <RewardsHeader />
      
      <div className="mt-4"> {/* Added margin-top for consistency */}
        {renderContent()}
      </div>
      
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        rewardData={rewardBeingEdited}
        onSave={async (data) => {
          try {
            const index = rewardBeingEdited?.index !== undefined ? rewardBeingEdited.index : null;
            await handleSaveReward(data, index);
          } catch (error) {
            console.error("Error saving reward:", error);
          }
        }}
        onDelete={async (id) => {
          try {
            const index = rewards.findIndex(r => String(r.id) === String(id));
            if (index !== -1) {
              await handleDeleteReward(index);
            }
            setIsEditorOpen(false);
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
        <ErrorBoundary fallbackMessage="Could not load rewards. Please try reloading.">
          <RewardsContent contentRef={contentRef} />
        </ErrorBoundary>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rewards;
