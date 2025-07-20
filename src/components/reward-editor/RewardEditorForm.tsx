import React, { useEffect } from 'react';
import { Reward, RewardFormValues } from '@/data/rewards/types';
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardImageSection from './RewardImageSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import RewardFormProvider from './RewardFormProvider';
import RewardFormSubmitHandler from './RewardFormSubmitHandler';
import DeleteRewardDialog from './DeleteRewardDialog';
import { useRewardIcon } from './hooks/useRewardIcon';
import { useRewardBackground } from './hooks/useRewardBackground';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useDeleteReward } from '@/data/rewards/mutations/useDeleteReward';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useIsMobile } from '@/hooks/use-mobile';

interface RewardEditorFormProps {
  rewardData?: Reward;
  onSave: (data: RewardFormValues) => Promise<Reward>; 
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const RewardEditorForm: React.FC<RewardEditorFormProps> = ({
  rewardData,
  onSave,
  onCancel,
  onDelete
}) => {
  const isMobile = useIsMobile();
  const deleteRewardMutation = useDeleteReward();
  
  const { 
    isDeleteDialogOpen, 
    setIsDeleteDialogOpen 
  } = useDeleteDialog();
  
  const {
    selectedIconName,
    iconPreview,
    handleSelectIcon,
    handleUploadIcon,
    handleRemoveIcon,
    setSelectedIconName,
    setIconPreview
  } = useRewardIcon(rewardData?.icon_name || undefined);
  
  const {
    imagePreview,
    handleImageUpload,
    handleRemoveImage,
    setImagePreview
  } = useRewardBackground(rewardData?.background_image_url);

  // Defensive blur for mobile to prevent auto-focus
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    if (rewardData) {
      setSelectedIconName(rewardData.icon_name || null);
      setIconPreview(null); // Rewards don't have icon_url property
      setImagePreview(rewardData.background_image_url || null);
    } else {
      setSelectedIconName(null);
      setIconPreview(null);
      setImagePreview(null);
    }
  }, [rewardData, setSelectedIconName, setImagePreview, setIconPreview]);

  return (
    <RewardFormProvider
      rewardData={rewardData}
      formBaseId="reward-editor"
      persisterExclude={['background_image_url', 'image_meta']} 
    >
      {(form, clearPersistedState) => {
        const handleSaveWithClear = async (dataFromFormSubmitHandler: RewardFormValues): Promise<Reward> => {
          try {
            const savedData = await onSave(dataFromFormSubmitHandler);
            await clearPersistedState();
            return savedData; 
          } catch (error: unknown) { 
            logger.error("Error saving reward within handleSaveWithClear:", getErrorMessage(error));
            throw error; 
          }
        };

        const handleCancelWithClear = () => {
          clearPersistedState(); 
          onCancel();
        };

        const handleDeleteWithClear = async () => {
          if (rewardData?.id) {
            try {
              await deleteRewardMutation.mutateAsync(rewardData.id);
              await clearPersistedState();
              setIsDeleteDialogOpen(false);
              onCancel(); // Close the main editor modal
            } catch (error) {
              logger.error("Error deleting reward:", error);
              // Error will be handled by the mutation's error handling
            }
          }
        };

        const handleImageUploadWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
          handleImageUpload(e, form.setValue);
        };

        const handleRemoveImageWrapper = () => {
          form.setValue('background_image_url', null);
          form.setValue('image_meta', null);
          handleRemoveImage();
        };

        return (
          <>
            <RewardFormSubmitHandler
              rewardData={rewardData}
              form={form}
              selectedIconName={selectedIconName}
              imagePreview={imagePreview}
              iconPreview={iconPreview}
              onSave={handleSaveWithClear} 
              onCancel={handleCancelWithClear} 
            >
              <RewardFormContent 
                form={form}
                selectedIconName={selectedIconName}
                iconPreview={iconPreview}
                imagePreview={imagePreview}
                isDeleteDialogOpen={isDeleteDialogOpen}
                setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                rewardData={rewardData}
                handleSelectIcon={handleSelectIcon}
                handleUploadIcon={handleUploadIcon}
                handleRemoveIcon={handleRemoveIcon}
                handleImageUpload={handleImageUploadWrapper}
                handleRemoveImage={handleRemoveImageWrapper}
                onCancel={handleCancelWithClear} 
                onDelete={handleDeleteWithClear} 
              />
            </RewardFormSubmitHandler>
            
            <DeleteRewardDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onConfirm={handleDeleteWithClear}
              rewardName={rewardData?.title}
            />
          </>
        );
      }}
    </RewardFormProvider>
  );
};

interface RewardFormContentProps {
  form: UseFormReturn<RewardFormValues>;
  selectedIconName: string | null;
  iconPreview: string | null;
  imagePreview: string | null;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rewardData?: Reward;
  handleSelectIcon: (iconName: string) => void;
  handleUploadIcon: () => void;
  handleRemoveIcon: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

const RewardFormContent: React.FC<RewardFormContentProps> = ({
  form,
  selectedIconName,
  iconPreview,
  imagePreview,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  rewardData,
  handleSelectIcon,
  handleUploadIcon,
  handleRemoveIcon,
  handleImageUpload,
  handleRemoveImage,
  onCancel,
  onDelete,
  isSaving 
}) => {
  const incrementCost = () => {
    form.setValue('cost', (form.watch('cost') || 0) + 1);
  };

  const decrementCost = () => {
    const currentCost = form.watch('cost') || 0;
    if (currentCost > 0) {
      form.setValue('cost', currentCost - 1);
    }
  };


  return (
    <>
      <RewardBasicDetails 
        control={form.control}
        incrementCost={incrementCost}
        decrementCost={decrementCost}
      />
      
      <RewardImageSection 
        control={form.control}
        setValue={form.setValue}
        imagePreview={imagePreview}
        initialPosition={{ x: form.watch('focal_point_x'), y: form.watch('focal_point_y') }}
        onRemoveImage={handleRemoveImage}
        onImageUpload={handleImageUpload}
      />
      
      <RewardIconSection
        selectedIconName={selectedIconName}
        iconPreview={iconPreview}
        iconColor={form.watch('icon_color')}
        onSelectIcon={handleSelectIcon}
        onUploadIcon={handleUploadIcon}
        onRemoveIcon={handleRemoveIcon}
      />
      
      <RewardColorSettings control={form.control} />
      
      <RewardFormActions 
        rewardData={rewardData}
        isSaving={isSaving}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </>
  );
};

export default RewardEditorForm;
