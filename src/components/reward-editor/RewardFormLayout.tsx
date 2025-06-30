
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { RewardFormValues, Reward } from '@/data/rewards/types';
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardImageSection from './RewardImageSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import DeleteRewardDialog from './DeleteRewardDialog';
import { handleImageUpload } from '@/utils/image/rewardIntegration';
import { logger } from '@/lib/logger';

interface RewardFormLayoutProps {
  form: UseFormReturn<RewardFormValues>;
  rewardData?: Reward;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
  onCancel?: () => void;
}

export const RewardFormLayout: React.FC<RewardFormLayoutProps> = ({
  form,
  rewardData,
  onDelete,
  isSaving = false,
  onCancel,
}) => {
  const { setValue, watch } = form;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    rewardData?.background_image_url || null
  );

  const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await handleImageUpload(file, setValue, setImagePreview);
      } catch (error) {
        logger.error('Error uploading image:', error);
      }
    }
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
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <RewardBasicDetails 
        control={form.control}
        incrementCost={incrementCost}
        decrementCost={decrementCost}
        incrementSupply={incrementSupply}
        decrementSupply={decrementSupply}
      />
      
      <RewardIconSection 
        selectedIconName={watch('icon_name')}
        iconPreview={null}
        iconColor={watch('icon_color')}
        onSelectIcon={handleSelectIcon}
        onUploadIcon={handleUploadIcon}
        onRemoveIcon={handleRemoveIcon}
      />
      
      <RewardImageSection 
        control={form.control}
        setValue={form.setValue}
        imagePreview={imagePreview}
        initialPosition={{ x: watch('focal_point_x'), y: watch('focal_point_y') }}
        onRemoveImage={handleRemoveImage}
        onImageUpload={handleImageUploadWrapper}
      />
      
      <RewardColorSettings control={form.control} />
      
      <RewardFormActions 
        rewardData={rewardData}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        onCancel={onCancel}
        onDelete={rewardData && onDelete ? () => setIsDeleteDialogOpen(true) : undefined}
        isSaving={isSaving}
      />
      
      <DeleteRewardDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirmWrapped}
        rewardName={rewardData?.title || 'this reward'}
      />
    </>
  );
};
