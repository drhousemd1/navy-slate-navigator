import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from "@/components/ui/form";
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardBackgroundSection from './RewardBackgroundSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import DeleteRewardDialog from './DeleteRewardDialog';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { logger } from '@/lib/logger';
import { Reward, RewardFormValues } from '@/data/rewards/types';

interface RewardEditorFormProps {
  rewardData?: Reward; // Changed from Partial<Reward>
  onSave: (formData: RewardFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
}

export const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  rewardData, 
  onSave, 
  onCancel,
  onDelete,
  isSaving = false
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const form = useForm<RewardFormValues>({
    defaultValues: {
      title: '',
      description: '',
      cost: 10,
      supply: 1, // Added supply default
      is_dom_reward: false,
      icon_name: null,
      icon_color: '#9b87f5',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      background_image_url: null,
      background_opacity: 100,
      focal_point_x: 50,
      focal_point_y: 50,
    }
  });

  const { control, handleSubmit, setValue, watch, reset } = form;

  const persisterFormId = `reward-editor-${rewardData?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: ['background_image_url']
  });

  useEffect(() => {
    if (rewardData) {
      // Fixed: Directly use boolean or default, removing string check
      const isDomRewardValue = rewardData.is_dom_reward ?? false;
      
      reset({
        title: rewardData.title || '',
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        supply: rewardData.supply || 1, // Added supply
        is_dom_reward: isDomRewardValue,
        icon_name: rewardData.icon_name || null,
        icon_color: rewardData.icon_color || '#9b87f5',
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        highlight_effect: rewardData.highlight_effect || false,
        background_image_url: rewardData.background_image_url || null,
        background_opacity: rewardData.background_opacity || 100,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
      });
    } else {
      reset({
        title: '', description: '', cost: 10, supply: 1, is_dom_reward: false, icon_name: null,
        icon_color: '#9b87f5', title_color: '#FFFFFF', subtext_color: '#8E9196',
        calendar_color: '#7E69AB', highlight_effect: false, background_image_url: null,
        background_opacity: 100, focal_point_x: 50, focal_point_y: 50,
      });
    }
  }, [rewardData, reset]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setValue('background_image_url', result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setValue('background_image_url', null);
  };

  const handleSelectIcon = (iconName: string) => {
    setValue('icon_name', iconName);
  };

  const handleUploadIcon = () => {
    logger.debug('Custom icon upload not implemented for rewards yet');
  };

  const handleRemoveIcon = () => {
    setValue('icon_name', null);
  };

  const incrementCost = () => {
    setValue('cost', (watch('cost') || 0) + 1);
  };

  const decrementCost = () => {
    const currentCost = watch('cost') || 0;
    if (currentCost > 0) {
      setValue('cost', currentCost - 1);
    }
  };

  const incrementSupply = () => {
    setValue('supply', (watch('supply') || 0) + 1);
  };

  const decrementSupply = () => {
    const currentSupply = watch('supply') || 0;
    if (currentSupply > 0) { // Or 1 if supply cannot be 0
      setValue('supply', currentSupply - 1);
    }
  };

  const handleDeleteConfirmWrapped = () => {
    if (onDelete && rewardData?.id) {
      onDelete(rewardData.id);
      clearPersistedState();
    }
    setIsDeleteDialogOpen(false);
  };

  const onSubmitWrapped = async (data: RewardFormValues) => {
    try {
      // Prepare form data with image_meta if it exists in the reward data
      const submissionData = {
        ...data,
        ...(rewardData?.image_meta && { image_meta: rewardData.image_meta })
      };
      
      await onSave(submissionData);
      await clearPersistedState();
    } catch (error) {
      logger.error("Error during onSave callback:", error);
    }
  };

  const handleCancelWrapped = () => {
    clearPersistedState();
    onCancel();
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmitWrapped)} className="space-y-6">
        <RewardBasicDetails 
          control={control}
          incrementCost={incrementCost}
          decrementCost={decrementCost}
          incrementSupply={incrementSupply} // Added supply handlers
          decrementSupply={decrementSupply} // Added supply handlers
          watch={watch} // Pass watch for supply field
        />
        
        <RewardIconSection 
          control={control}
          selectedIconName={watch('icon_name')}
          iconPreview={null} // Assuming iconPreview comes from state or elsewhere if custom upload is used
          iconColor={watch('icon_color')}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon} // This should eventually set icon_url or preview
          onRemoveIcon={handleRemoveIcon}
        />
        
        <RewardBackgroundSection 
          control={control}
          imagePreview={watch('background_image_url')}
          initialPosition={{ x: watch('focal_point_x'), y: watch('focal_point_y') }}
          onRemoveImage={handleRemoveImage}
          onImageUpload={(e) => {
            if (e.target.files?.[0]) {
              handleImageUpload(e.target.files[0]);
            }
          }}
          setValue={setValue}
        />
        
        <RewardColorSettings 
          control={control}
        />
        
        <RewardFormActions 
          rewardData={rewardData} // This is now Reward | undefined
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          onCancel={handleCancelWrapped}
          onDelete={rewardData && onDelete ? () => setIsDeleteDialogOpen(true) : undefined}
          isSaving={isSaving}
        />
        
        <DeleteRewardDialog 
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirmWrapped}
          rewardName={rewardData?.title || 'this reward'}
        />
      </form>
    </Form>
  );
};
