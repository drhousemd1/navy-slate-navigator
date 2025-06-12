import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from "@/components/ui/form";
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardImageSection from './RewardImageSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import DeleteRewardDialog from './DeleteRewardDialog';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { logger } from '@/lib/logger';
import { Reward, RewardFormValues } from '@/data/rewards/types';

interface RewardEditorFormProps {
  rewardData?: Reward;
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
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  const form = useForm<RewardFormValues>({
    defaultValues: {
      title: '',
      description: '',
      cost: 10,
      supply: 1,
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
      image_meta: null,
    }
  });

  const { control, handleSubmit, setValue, watch, reset } = form;

  const persisterFormId = `reward-editor-${rewardData?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: ['background_image_url']
  });

  useEffect(() => {
    if (rewardData) {
      const isDomRewardValue = rewardData.is_dom_reward ?? false;
      
      reset({
        title: rewardData.title || '',
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        supply: rewardData.supply || 1,
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
        image_meta: rewardData.image_meta || null,
      });
      
      setImagePreview(rewardData.background_image_url || null);
    } else {
      reset({
        title: '', description: '', cost: 10, supply: 1, is_dom_reward: false, icon_name: null,
        icon_color: '#9b87f5', title_color: '#FFFFFF', subtext_color: '#8E9196',
        calendar_color: '#7E69AB', highlight_effect: false, background_image_url: null,
        background_opacity: 100, focal_point_x: 50, focal_point_y: 50, image_meta: null,
      });
      setImagePreview(null);
    }
  }, [rewardData, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // This will be handled by the wrapper component
  };

  const handleRemoveImage = () => {
    setValue('background_image_url', null);
    setValue('image_meta', null);
    setImagePreview(null);
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
    if (currentSupply > 0) {
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
      await onSave(data);
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
          incrementSupply={incrementSupply}
          decrementSupply={decrementSupply}
          watch={watch}
        />
        
        <RewardIconSection 
          control={control}
          selectedIconName={watch('icon_name')}
          iconPreview={null}
          iconColor={watch('icon_color')}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />
        
        <RewardImageSection 
          control={control}
          imagePreview={imagePreview}
          initialPosition={{ x: watch('focal_point_x'), y: watch('focal_point_y') }}
          onRemoveImage={handleRemoveImage}
          onImageUpload={handleImageUpload}
          setValue={setValue}
          setImagePreview={setImagePreview}
        />
        
        <RewardColorSettings 
          control={control}
        />
        
        <RewardFormActions 
          rewardData={rewardData}
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
