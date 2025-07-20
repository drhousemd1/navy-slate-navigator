import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import RewardsList from '../components/rewards/RewardsList';
import RewardEditor from '../components/RewardEditor';
import RewardsHeader from '../components/rewards/RewardsHeader';
import ErrorBoundary from '@/components/ErrorBoundary';

import { Reward, RewardFormValues } from '@/data/rewards/types'; 

import { useRewards } from '@/contexts/RewardsContext';
import { logger } from '@/lib/logger';

const RewardsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewReward?: () => void }>
}> = ({ contentRef }) => {
  const { 
    rewards,
    isLoading,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward
  } = useRewards();

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

  const handleBuyRewardWrapper = async (rewardId: string, cost: number) => {
    try {
      await handleBuyReward(rewardId, cost);
    } catch (e) {
      logger.error("Error buying reward from page:", e);
    }
  };

  const handleUseRewardWrapper = async (rewardId: string) => {
    try {
      await handleUseReward(rewardId);
    } catch (e) {
      logger.error("Error using reward from page:", e);
    }
  };
  
  useEffect(() => {
    contentRef.current = { handleAddNewReward };
    return () => { contentRef.current = {}; };
  }, [contentRef]); 

  const handleSaveRewardEditor = async (formData: RewardFormValues): Promise<Reward> => {
    const rewardIndex = rewardBeingEdited ? rewards.findIndex(r => r.id === rewardBeingEdited.id) : null;
    
    // Include the existing reward ID if we're editing
    const rewardDataWithId = rewardBeingEdited ? 
      { ...formData, id: rewardBeingEdited.id } : 
      formData;
    
    const savedRewardId = await handleSaveReward(rewardDataWithId, rewardIndex);
    
    if (!savedRewardId) {
      throw new Error("Failed to save reward");
    }
    
    // Find the saved reward in the list
    const savedReward = rewards.find(r => r.id === savedRewardId) || {
      ...formData,
      id: savedRewardId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: '', // This will be set by the backend
    } as Reward;
    
    setIsEditorOpen(false);
    setRewardBeingEdited(undefined);
    return savedReward;
  };

  const handleDeleteRewardEditor = async (idToDelete?: string): Promise<void> => {
    const finalIdToDelete = idToDelete || rewardBeingEdited?.id;
    if (!finalIdToDelete) {
      return;
    }
    
    // Find the reward index from the ID
    const rewardIndex = rewards.findIndex(r => r.id === finalIdToDelete);
    if (rewardIndex === -1) {
      logger.error("Reward not found for deletion:", finalIdToDelete);
      return;
    }
    
    try {
      // Wait for the deletion to complete
      const success = await handleDeleteReward(rewardIndex);
      
      if (success) {
        // Only close the editor after successful deletion
        setIsEditorOpen(false);
        setRewardBeingEdited(undefined);
        logger.debug("Reward deleted successfully");
      } else {
        logger.error("Failed to delete reward");
        throw new Error("Failed to delete reward");
      }
    } catch (error) {
      logger.error("Error in handleDeleteRewardEditor:", error);
      throw error; // Re-throw to let the RewardEditor handle the error
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
          handleBuyReward={handleBuyRewardWrapper}
          handleUseReward={handleUseRewardWrapper}
          error={null}
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
