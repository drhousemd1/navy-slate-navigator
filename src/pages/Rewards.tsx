import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import RewardsHeader from '../components/rewards/RewardsHeader';
import ErrorBoundary from '@/components/ErrorBoundary';

import { useRewards as useRewardsQuery, RewardsQueryResult } from '@/data/queries/useRewards';
import { Reward } from '@/data/rewards/types';
import { useCreateRewardMutation, useUpdateRewardMutation, CreateRewardVariables, UpdateRewardVariables } from '@/data/rewards/mutations/useSaveReward';
import { useDeleteReward as useDeleteRewardMutation } from '@/data/rewards/mutations/useDeleteReward';
import { toast } from '@/hooks/use-toast';

import { useBuySubReward, useRedeemSubReward } from '@/data/rewards/mutations';
import { useAuth } from '@/contexts/AuthContext';
import { usePointsManager } from '@/data/points/usePointsManager';

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { 
    data: rewardsData, 
    isLoading, 
    error: queryError,
  }: RewardsQueryResult = useRewardsQuery();
  const rewards = Array.isArray(rewardsData) ? rewardsData : [];

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<Reward | undefined>(undefined);
  
  const createRewardMutation = useCreateRewardMutation();
  const updateRewardMutation = useUpdateRewardMutation();
  const deleteRewardMutation = useDeleteRewardMutation();
  
  const buySubRewardMutation = useBuySubReward();
  const redeemSubRewardMutation = useRedeemSubReward();
  const { user } = useAuth();
  const { points: currentUserPoints } = usePointsManager();

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
        currentPoints: currentUserPoints ?? 0
      });
    } catch (e) {
      console.error("Error buying reward from page:", e);
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
  }, [contentRef]); 

  const handleSaveRewardEditor = async (formData: Partial<Reward>): Promise<Reward | void> => {
    try {
      if (rewardBeingEdited?.id) {
        const updateVariables: UpdateRewardVariables = {
          id: rewardBeingEdited.id,
          ...formData, 
        };
        const updated = await updateRewardMutation.mutateAsync(updateVariables);
        setIsEditorOpen(false);
        setRewardBeingEdited(undefined);
        return updated;
      } else {
        if (!formData.title || typeof formData.cost !== 'number' || typeof formData.supply !== 'number' || typeof formData.is_dom_reward !== 'boolean') {
          toast({ title: "Missing required fields", description: "Title, cost, supply, and DOM status are required.", variant: "destructive" });
          throw new Error("Missing required fields for reward creation.");
        }
        const createVariables: CreateRewardVariables = {
          title: formData.title,
          cost: formData.cost,
          supply: formData.supply,
          is_dom_reward: formData.is_dom_reward,
          description: formData.description || null,
          background_image_url: formData.background_image_url || null,
          background_opacity: formData.background_opacity ?? 100,
          icon_name: formData.icon_name || 'Award',
          icon_url: formData.icon_url || null,
          icon_color: formData.icon_color || '#9b87f5',
          title_color: formData.title_color || '#FFFFFF',
          subtext_color: formData.subtext_color || '#8E9196',
          calendar_color: formData.calendar_color || '#7E69AB',
          highlight_effect: formData.highlight_effect ?? false,
          focal_point_x: formData.focal_point_x ?? 50,
          focal_point_y: formData.focal_point_y ?? 50,
        };
        const created = await createRewardMutation.mutateAsync(createVariables);
        setIsEditorOpen(false);
        setRewardBeingEdited(undefined);
        return created;
      }
    } catch (e) {
      console.error("Error saving reward from page:", e);
      if (!(e instanceof Error && e.message.includes("Missing required fields"))) {
        toast({ title: "Save Error", description: e instanceof Error ? e.message : "Could not save reward.", variant: "destructive" });
      }
      throw e;
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
  
  return (
    <div className="p-4 pt-6">
      <RewardsHeader onAddNewReward={handleAddNewReward} /> 
      <div className="mt-4">
        <RewardsList 
          rewards={rewards}
          isLoading={isLoading}
          onEdit={handleEditReward}
          handleBuyReward={handleBuyRewardWrapper}
          handleUseReward={handleUseRewardWrapper}
          error={queryError}
        />
      </div>
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setRewardBeingEdited(undefined);
        }}
        rewardData={rewardBeingEdited}
        onSave={handleSaveRewardEditor}
        onDelete={rewardBeingEdited?.id ? () => handleDeleteRewardEditor(rewardBeingEdited.id) : undefined}
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
