
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import RewardsHeader from '../components/rewards/RewardsHeader';
import { useSyncManager } from '@/hooks/useSyncManager';
import { usePreloadRewards } from "@/data/preload/usePreloadRewards";
import RewardCardSkeleton from '@/components/rewards/RewardCardSkeleton';
import { Award as AwardIcon } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

import { useRewards } from '@/data/queries/useRewards';
// Import specific mutation hooks
import { useCreateRewardMutation, useUpdateRewardMutation } from '@/data/rewards/mutations/useSaveReward';
import { useDeleteRewardMutation } from '@/data/rewards/mutations/useDeleteReward';
import { Reward, CreateRewardVariables, UpdateRewardVariables } from '@/data/rewards/types';
import { toast } from '@/hooks/use-toast';

usePreloadRewards()();

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { data: rewardsData, isLoading, error, refetch: refetchRewardsQuery } = useRewards(); // Renamed to rewardsData to avoid conflict if needed
  const rewards = Array.isArray(rewardsData) ? rewardsData : []; // Ensure rewards is always an array

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<Reward | undefined>(undefined);
  
  const { syncNow } = useSyncManager({ intervalMs: 30000, enabled: true });
  
  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMutation = useDeleteRewardMutation();

  useEffect(() => {
    syncNow();
  }, [syncNow]);
  
  const handleAddNewReward = () => {
    setRewardBeingEdited(undefined);
    setIsEditorOpen(true);
  };
  
  const handleEditReward = (index: number) => { 
    if (Array.isArray(rewards)) { // Use the processed 'rewards' array
        const rewardToEdit = rewards[index];
        if (rewardToEdit) {
        setRewardBeingEdited(rewardToEdit);
        setIsEditorOpen(true);
        } else {
        toast({ title: "Error", description: "Could not find reward to edit.", variant: "destructive" });
        }
    } else {
        // This else block might be redundant now since rewards is guaranteed to be an array
        toast({ title: "Error", description: "Rewards data is not available.", variant: "destructive" });
    }
  };
  
  useEffect(() => {
    contentRef.current = { handleAddNewReward };
    return () => { contentRef.current = {}; };
  }, [contentRef, handleAddNewReward]);

  const handleSaveRewardEditor = async (formData: Partial<Reward>) => {
    try {
      if (rewardBeingEdited?.id) {
        const updateVariables: UpdateRewardVariables = {
          id: rewardBeingEdited.id,
          ...formData,
        };
        await updateRewardMutation.mutateAsync(updateVariables);
      } else {
        if (!formData.title || typeof formData.cost !== 'number' || typeof formData.supply !== 'number' || typeof formData.is_dom_reward !== 'boolean') {
          toast({ title: "Missing required fields", description: "Title, cost, supply, and DOM status are required.", variant: "destructive" });
          return;
        }
        const createVariables: CreateRewardVariables = {
          title: formData.title,
          cost: formData.cost,
          supply: formData.supply,
          is_dom_reward: formData.is_dom_reward,
          description: formData.description || null,
          background_image_url: formData.background_image_url || null,
          background_opacity: formData.background_opacity === undefined ? 100 : formData.background_opacity,
          icon_name: formData.icon_name || 'Award',
          icon_url: formData.icon_url || null,
          icon_color: formData.icon_color || '#9b87f5',
          title_color: formData.title_color || '#FFFFFF',
          subtext_color: formData.subtext_color || '#8E9196',
          calendar_color: formData.calendar_color || '#7E69AB',
          highlight_effect: formData.highlight_effect === undefined ? false : formData.highlight_effect,
          focal_point_x: formData.focal_point_x === undefined ? 50 : formData.focal_point_x,
          focal_point_y: formData.focal_point_y === undefined ? 50 : formData.focal_point_y,
        };
        await createRewardMutation.mutateAsync(createVariables);
      }
      setIsEditorOpen(false);
      setRewardBeingEdited(undefined);
    } catch (e) {
      console.error("Error saving reward from page:", e);
    }
  };

  const handleDeleteRewardEditor = async (idToDelete?: string) => {
    const finalIdToDelete = idToDelete || rewardBeingEdited?.id;
    if (!finalIdToDelete) {
      toast({ title: "Error", description: "No reward ID specified for deletion.", variant: "destructive" });
      return;
    }
    try {
      await deleteRewardMutation.mutateAsync(finalIdToDelete);
      setIsEditorOpen(false);
      setRewardBeingEdited(undefined);
    } catch (e) {
      console.error("Error deleting reward from page:", e);
    }
  };
  
  const renderContent = () => {
    if (isLoading && rewards.length === 0) { // Use processed 'rewards' array
      return (
        <div className="space-y-4 mt-4">
          <RewardCardSkeleton />
          <RewardCardSkeleton />
          <RewardCardSkeleton />
        </div>
      );
    }
    
    if (error) {
        return <div className="text-red-500 p-4">Error loading rewards: {error.message}</div>;
    }

    if (!isLoading && rewards.length === 0) { // Use processed 'rewards' array
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AwardIcon className="h-16 w-16 text-gray-500 mb-4" />
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
        // rewards prop removed as RewardsList gets data from context
        onEdit={handleEditReward} 
      />
    );
  };

  return (
    <div className="p-4 pt-6">
      <RewardsHeader /> 
      <div className="mt-4">
        {renderContent()}
      </div>
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setRewardBeingEdited(undefined);
        }}
        rewardData={rewardBeingEdited}
        onSave={handleSaveRewardEditor}
        onDelete={handleDeleteRewardEditor}
      />
    </div>
  );
};

const Rewards: React.FC = () => {
  const contentRef = useRef<{ handleAddNewReward?: () => void }>({});
  
  const handleAddNewRewardFromLayout = () => {
    if (contentRef.current.handleAddNewReward) {
      contentRef.current.handleAddNewReward();
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddNewRewardFromLayout}>
      <ErrorBoundary fallbackMessage="Could not load rewards. Please try reloading.">
        <RewardsContent contentRef={contentRef} />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Rewards;

