
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import RewardsHeader from '../components/rewards/RewardsHeader';
import ErrorBoundary from '@/components/ErrorBoundary';

import { Reward, RewardFormValues } from '@/data/rewards/types'; 
import { useRewards } from '@/data/queries/useRewards';
import { useCreateReward, useUpdateReward, useDeleteReward } from '@/data/rewards/mutations';
import { useBuySubReward, useBuyDomReward, useRedeemSubReward, useRedeemDomReward } from '@/data/rewards/mutations';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { data: rewards = [], isLoading, error } = useRewards();
  const createRewardMutation = useCreateReward();
  const updateRewardMutation = useUpdateReward();
  const deleteRewardMutation = useDeleteReward();
  const buySubRewardMutation = useBuySubReward();
  const buyDomRewardMutation = useBuyDomReward();
  const redeemSubRewardMutation = useRedeemSubReward();
  const redeemDomRewardMutation = useRedeemDomReward();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [rewardBeingEdited, setRewardBeingEdited] = useState<Reward | undefined>(undefined);

  const handleAddNewReward = () => {
    setRewardBeingEdited(undefined);
    setIsEditorOpen(true);
  };
  
  const handleEditReward = (rewardToEdit: Reward) => {
    if (rewardToEdit) {
      setRewardBeingEdited(rewardToEdit);
      setIsEditorOpen(true);
    }
  };

  const handleBuyReward = async (rewardId: string, cost: number) => {
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) {
        toast({ title: "Error", description: "Reward not found", variant: "destructive" });
        return;
      }

      if (reward.is_dom_reward) {
        await buyDomRewardMutation.mutateAsync({ rewardId, cost });
      } else {
        await buySubRewardMutation.mutateAsync({ rewardId, cost });
      }
    } catch (error) {
      logger.error("Error buying reward:", error);
    }
  };

  const handleUseReward = async (rewardId: string) => {
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) {
        toast({ title: "Error", description: "Reward not found", variant: "destructive" });
        return;
      }

      if (reward.is_dom_reward) {
        await redeemDomRewardMutation.mutateAsync({ rewardId });
      } else {
        await redeemSubRewardMutation.mutateAsync({ rewardId });
      }
    } catch (error) {
      logger.error("Error using reward:", error);
    }
  };
  
  useEffect(() => {
    contentRef.current = { handleAddNewReward };
    return () => { contentRef.current = {}; };
  }, [contentRef]); 

  const handleSaveRewardEditor = async (formData: RewardFormValues): Promise<Reward> => {
    try {
      let savedReward: Reward;
      
      if (rewardBeingEdited) {
        // Update existing reward
        savedReward = await updateRewardMutation.mutateAsync({
          id: rewardBeingEdited.id,
          ...formData
        });
      } else {
        // Create new reward
        savedReward = await createRewardMutation.mutateAsync(formData);
      }
      
      setIsEditorOpen(false);
      setRewardBeingEdited(undefined);
      return savedReward;
    } catch (error) {
      logger.error("Error saving reward:", error);
      throw error;
    }
  };

  const handleDeleteRewardEditor = async (): Promise<void> => {
    if (!rewardBeingEdited?.id) {
      return;
    }
    
    try {
      await deleteRewardMutation.mutateAsync(rewardBeingEdited.id);
      setIsEditorOpen(false);
      setRewardBeingEdited(undefined);
      logger.debug("Reward deleted successfully");
    } catch (error) {
      logger.error("Error deleting reward:", error);
      throw error;
    }
  };
  
  return (
    <div className="p-4 pt-6 max-w-4xl mx-auto">
      <RewardsHeader onAddNewReward={handleAddNewReward} /> 
      <div className="mt-4">
        <RewardsList 
          rewards={rewards}
          isLoading={isLoading}
          onEdit={handleEditReward}
          handleBuyReward={handleBuyReward}
          handleUseReward={handleUseReward}
          error={error}
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
        onDelete={rewardBeingEdited?.id ? handleDeleteRewardEditor : undefined}
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
