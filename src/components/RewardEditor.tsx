import React, { useState, useEffect } from 'react';
import RewardEditorForm from './rewards/RewardEditorForm';
import { Reward, CreateRewardVariables, UpdateRewardVariables } from '@/data/rewards/types';
import { useCreateReward, useUpdateReward, useDeleteReward } from '@/data/rewards/mutations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { logger } from '@/lib/logger'; // Added logger

interface RewardEditorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  rewardData?: Reward | null;
  onSaveSuccess?: (savedReward: Reward) => void;
  onDeleteSuccess?: (rewardId: string) => void;
  isDomReward?: boolean; // To set the default type for new rewards
}

const RewardEditor: React.FC<RewardEditorProps> = ({
  isOpen,
  onOpenChange,
  rewardData: initialData, // Renamed for clarity
  onSaveSuccess,
  onDeleteSuccess,
  isDomReward = false, // Default to sub reward if not specified
}) => {
  const createRewardMutation = useCreateReward();
  const updateRewardMutation = useUpdateReward();
  const deleteRewardMutation = useDeleteReward();

  // Internal state to manage the form's data, including whether it's a new reward
  const [currentRewardData, setCurrentRewardData] = useState<Reward | CreateRewardVariables | undefined>(undefined);
  const [isCreatingNew, setIsCreatingNew] = useState(true);

  useEffect(() => {
    if (isOpen) {
      logger.log('RewardEditor initialData:', initialData);
      if (initialData && initialData.id) {
        setCurrentRewardData(initialData);
        setIsCreatingNew(false);
      } else {
        // For new reward, set is_dom_reward based on prop
        const newRewardBase: CreateRewardVariables = {
          title: '',
          cost: 10,
          is_dom_reward: isDomReward,
          // other fields will be defaulted by the form or are optional
          supply: null, // Explicitly null for optional number
          description: null,
          background_image_url: null,
          background_opacity: 100,
          icon_name: null,
          icon_url: null,
          icon_color: '#9b87f5', // Default icon color
          title_color: '#FFFFFF',
          subtext_color: '#8E9196',
          calendar_color: '#7E69AB',
          highlight_effect: false,
          focal_point_x: 50,
          focal_point_y: 50,
        };
        setCurrentRewardData(newRewardBase);
        setIsCreatingNew(true);
      }
    }
    logger.log("Is Creating New Reward:", !initialData || !initialData.id);
  }, [isOpen, initialData, isDomReward]);


  const handleSave = async (values: Partial<Reward>): Promise<Reward | null> => {
    logger.log('RewardEditor handleSave data:', values);
    logger.log("Form values before save:", values);
    try {
      let savedReward: Reward;
      if (!isCreatingNew && currentRewardData && 'id' in currentRewardData && currentRewardData.id) {
        // Update existing reward
        const updatePayload: UpdateRewardVariables = { 
          id: currentRewardData.id, 
          ...values 
        };
        savedReward = await updateRewardMutation.mutateAsync(updatePayload);
      } else {
        // Create new reward
        // Ensure required fields are present for CreateRewardVariables
        const createPayload: CreateRewardVariables = {
          title: values.title || 'Untitled Reward',
          cost: values.cost === undefined ? 10 : values.cost,
          is_dom_reward: values.is_dom_reward === undefined ? isDomReward : values.is_dom_reward,
          supply: values.supply === undefined ? null : values.supply, // Explicitly null for optional number
          description: values.description || null,
          background_image_url: values.background_image_url || null,
          background_opacity: values.background_opacity === undefined ? 100 : values.background_opacity,
          icon_name: values.icon_name || null,
          icon_url: values.icon_url || null,
          icon_color: values.icon_color || '#9b87f5',
          title_color: values.title_color || '#FFFFFF',
          subtext_color: values.subtext_color || '#8E9196',
          calendar_color: values.calendar_color || '#7E69AB',
          highlight_effect: values.highlight_effect === undefined ? false : values.highlight_effect,
          focal_point_x: values.focal_point_x === undefined ? 50 : values.focal_point_x,
          focal_point_y: values.focal_point_y === undefined ? 50 : values.focal_point_y,
        };
        savedReward = await createRewardMutation.mutateAsync(createPayload);
      }
      logger.log('Reward saved successfully:', savedReward ? { ...savedReward, id: '[REWARD_ID]' } : null);
      onSaveSuccess?.(savedReward);
      onOpenChange(false); // Close dialog on success
      return savedReward;
    } catch (error) {
      logger.error("Error saving reward:", error);
      // Error toast is handled by optimistic mutation hooks
      throw error; // Re-throw for form handling
    }
  };

  const handleDelete = async (rewardId: string) => {
    logger.log("Deleting reward ID:", rewardId);
    try {
      await deleteRewardMutation.mutateAsync(rewardId);
      logger.log('Reward deleted successfully');
      onDeleteSuccess?.(rewardId);
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      logger.error(`Error deleting reward ${rewardId}:`, error);
      // Error toast handled by optimistic mutation hook
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const editorTitle = isCreatingNew ? "Create New Reward" : "Edit Reward";
  const editorDescription = isCreatingNew
    ? "Configure the details for the new reward."
    : `Editing "${(currentRewardData as Reward)?.title || 'reward'}". Make your changes below.`;
  
  // Key prop for RewardEditorForm to force re-initialization when switching between create/edit
  const formKey = isCreatingNew ? 'create' : (currentRewardData as Reward)?.id || 'edit';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editorTitle}</DialogTitle>
          <DialogDescription>{editorDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2">
          {currentRewardData && ( // Ensure currentRewardData is defined before rendering form
            <RewardEditorForm
              key={formKey} // Force re-render on data change
              rewardData={currentRewardData}
              isDomRewardInitial={isCreatingNew ? isDomReward : (currentRewardData as Reward)?.is_dom_reward}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={!isCreatingNew && currentRewardData && 'id' in currentRewardData ? handleDelete : undefined}
              isCreatingNew={isCreatingNew}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RewardEditor;
