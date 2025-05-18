import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import RewardsHeader from '../components/rewards/RewardsHeader';
import { useSyncManager } from '@/hooks/useSyncManager';
import ErrorBoundary from '@/components/ErrorBoundary';

import { useRewards as useRewardsQuery } from '@/data/queries/useRewards';
import { useCreateRewardMutation, useUpdateRewardMutation } from '@/data/rewards/mutations/useSaveReward';
import { useDeleteReward as useDeleteRewardMutation } from '@/data/rewards/mutations/useDeleteReward';
import { Reward, UpdateRewardVariables } from '@/data/rewards/types';
import { toast } from '@/hooks/use-toast';

import { useBuySubReward, useRedeemSubReward } from '@/data/rewards/mutations';
import { useAuth } from '@/contexts/AuthContext';
import { usePointsManager } from '@/data/points/usePointsManager';

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { data: rewardsData, isLoading, error: queryError } = useRewardsQuery();
  const rewards = Array.isArray(rewardsData) ? rewardsData : [];

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<Reward | undefined>(undefined);
  
  const { syncNow } = useSyncManager({ intervalMs: 30000, enabled: true });
  
  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMutation = useDeleteRewardMutation();
  
  const buySubRewardMutation = useBuySubReward();
  const redeemSubRewardMutation = useRedeemSubReward();
  const { user } = useAuth();
  const { points: currentUserPoints } = usePointsManager();

  useEffect(() => {
    syncNow();
  }, [syncNow]);
  
  const handleAddNewReward = () => {
    setRewardBeingEdited(undefined);
    setIsEditorOpen(true);
  };
  
  const handleEditReward = (rewardToEdit: Reward) => {
    if (rewardToEdit) {
      setRewardBeingEdited(rewardToEdit);
      setIsEditorOpen(true);
    } else {
      toast({ title: "Error", description: "Could not find reward to edit.", variant: "destructive" });
    }
  };

  const handleBuyRewardWrapper = async (rewardId: string, cost: number) => {
    const rewardToBuy = rewards.find(r => r.id === rewardId);
    if (!rewardToBuy) {
      toast({ title: "Error", description: "Reward not found.", variant: "destructive" });
      return;
    }
    if (!user || !user.id) {
      toast({ title: "Error", description: "User profile not available. Please log in.", variant: "destructive" });
      return;
    }
    // Assuming non-DOM reward for this specific hook
    if (rewardToBuy.is_dom_reward) {
        toast({ title: "Action not supported", description: "This action is for non-DOM rewards. DOM reward purchase not implemented on this button yet.", variant: "destructive" });
        return;
    }

    try {
      await buySubRewardMutation.mutateAsync({ 
        rewardId, 
        cost,
        currentSupply: rewardToBuy.supply,
        profileId: user.id,
        currentPoints: currentUserPoints
      });
    } catch (e) {
      console.error("Error buying reward from page:", e);
      // Error toast should be handled by the mutation hook's onError
    }
  };

  const handleUseRewardWrapper = async (rewardId: string) => {
    const rewardToUse = rewards.find(r => r.id === rewardId);
    if (!rewardToUse) {
      toast({ title: "Error", description: "Reward not found.", variant: "destructive" });
      return;
    }
     if (!user || !user.id) {
      toast({ title: "Error", description: "User profile not available. Please log in.", variant: "destructive" });
      return;
    }
    // Assuming non-DOM reward for this specific hook
     if (rewardToUse.is_dom_reward) {
        toast({ title: "Action not supported", description: "This action is for non-DOM rewards. DOM reward usage not implemented on this button yet.", variant: "destructive" });
        return;
    }

    try {
      await redeemSubRewardMutation.mutateAsync({
        rewardId,
        currentSupply: rewardToUse.supply,
        profileId: user.id
      });
    } catch (e) {
      console.error("Error using reward from page:", e);
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
        const createVariables = {
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
    if (isLoading && rewards.length === 0) {
      return (
        <div className="space-y-4 mt-4">
          <RewardsList 
            rewards={[]}
            isLoading={true}
            onEdit={handleEditReward}
            onCreateRewardClick={handleAddNewReward}
            handleBuyReward={handleBuyRewardWrapper}
            handleUseReward={handleUseRewardWrapper}
          />
        </div>
      );
    }
    
    if (queryError) {
        return <div className="text-red-500 p-4">Error loading rewards: {queryError.message}</div>;
    }

    return (
      <RewardsList 
        rewards={rewards}
        isLoading={isLoading && rewards.length === 0}
        onEdit={handleEditReward}
        onCreateRewardClick={handleAddNewReward}
        handleBuyReward={handleBuyRewardWrapper}
        handleUseReward={handleUseRewardWrapper}
      />
    );
  };

  return (
    <div className="p-4 pt-6">
      <RewardsHeader onAddNewReward={handleAddNewReward} /> 
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
