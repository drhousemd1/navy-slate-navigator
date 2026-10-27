import React, { useEffect, useState } from 'react';
import { Reward, RewardFormValues } from '@/data/rewards/types';
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardImageSection from './RewardImageSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import RewardFormProvider from './RewardFormProvider';
import RewardFormSubmitHandler from './RewardFormSubmitHandler';
import DeleteRewardDialog from './DeleteRewardDialog';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useRewards } from '@/contexts/RewardsContext';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { readBackgroundDraft, captureDraftImageSession, chooseDraftIcon, reportDraftImageError } from '@/lib/editorDrafts';
import { useIsMobile } from '@/hooks/use-mobile';

interface RewardEditorFormProps {
  rewardData?: Reward;
  onSave: (data: RewardFormValues) => Promise<Reward>; 
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const RewardEditorForm: React.FC<RewardEditorFormProps> = ({
  rewardData,
  onSave,
  onCancel,
  onDelete
}) => {
  const isMobile = useIsMobile();
  const { atomicAccounting } = useRewards();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const { 
    isDeleteDialogOpen, 
    setIsDeleteDialogOpen 
  } = useDeleteDialog();
  
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

  return (
    <RewardFormProvider
      rewardData={rewardData}
      formBaseId="reward-editor"
    >
      {(form, clearPersistedState) => {
        const selectedIconName = form.watch('icon_name') ?? null;
        const iconPreview = selectedIconName?.startsWith('custom:') ? selectedIconName.slice(7) : null;
        const imagePreview = form.watch('background_image_url') ?? null;
        const handleSelectIcon = (name: string) => form.setValue('icon_name', name, { shouldDirty: true });
        const handleUploadIcon = () => {
          const applyImage = captureDraftImageSession(form);
          chooseDraftIcon(url => applyImage(() => handleSelectIcon(`custom:${url}`)));
        };
        const handleRemoveIcon = () => form.setValue('icon_name', null, { shouldDirty: true });
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

        const handleCancelWithClear = async () => {
          if (await clearPersistedState()) onCancel();
        };

        const handleDeleteWithClear = async () => {
          if (rewardData?.id && onDelete && !deleting) {
            setDeleting(true); setDeleteError(null);
            try {
              await onDelete(rewardData.id);
              await clearPersistedState();
              setIsDeleteDialogOpen(false);
              onCancel(); // Close the main editor modal
            } catch (error) {
              logger.error("Error deleting reward:", error);
              setDeleteError(getErrorMessage(error));
            } finally { setDeleting(false); }
          }
        };

        const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const applyImage = captureDraftImageSession(form);
          try {
            const { url, metadata } = await readBackgroundDraft(file);
            applyImage(() => {
              form.setValue('background_image_url', url, { shouldDirty: true });
              form.setValue('image_meta', metadata, { shouldDirty: true });
            });
          } catch { reportDraftImageError(); }
        };

        const handleRemoveImageWrapper = () => {
          form.setValue('background_image_url', null, { shouldDirty: true });
          form.setValue('image_meta', null, { shouldDirty: true });
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
              atomicAccounting={atomicAccounting}
              busy={deleting}
              error={deleteError}
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
