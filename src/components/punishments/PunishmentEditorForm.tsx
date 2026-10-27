
import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/punishments/types'; // Updated import path
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentImageSection from './form/PunishmentImageSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';
import PunishmentFormProvider, { PunishmentFormValues } from './form/PunishmentFormProvider';
import PunishmentFormSubmitHandler from './form/PunishmentFormSubmitHandler';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { readBackgroundDraft, captureDraftImageSession, chooseDraftIcon, reportDraftImageError } from '@/lib/editorDrafts';
import { useIsMobile } from '@/hooks/use-mobile';

interface PunishmentEditorFormProps {
  punishmentData?: PunishmentData;
  preserveHistory?: boolean;
  onSave: (data: Partial<PunishmentData>) => Promise<PunishmentData>; 
  onCancel: () => void;
  onDelete?: (id: string) => void | Promise<void>;
}

const PunishmentEditorForm: React.FC<PunishmentEditorFormProps> = ({
  punishmentData, preserveHistory = false,
  onSave,
  onCancel,
  onDelete
}) => {
  const isMobile = useIsMobile();
  
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
    <PunishmentFormProvider
      punishmentData={punishmentData}
      formBaseId="punishment-editor"
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
        const handleSaveWithClear = async (dataFromFormSubmitHandler: Partial<PunishmentData>): Promise<PunishmentData> => {
          try {
            const savedData = await onSave(dataFromFormSubmitHandler);
            await clearPersistedState();
            return savedData; 
          } catch (error: unknown) { 
            logger.error("Error saving punishment within handleSaveWithClear:", getErrorMessage(error));
            throw error; 
          }
        };

        const handleCancelWithClear = async () => {
          if (await clearPersistedState()) onCancel();
        };

        const handleDeleteWithClear = async () => {
          if (onDelete && punishmentData?.id) {
            await onDelete(punishmentData.id);
          }
          await clearPersistedState();
          setIsDeleteDialogOpen(false);
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
          <PunishmentFormSubmitHandler
            punishmentData={punishmentData}
            form={form}
            selectedIconName={selectedIconName}
            imagePreview={imagePreview}
            iconPreview={iconPreview}
            onSave={handleSaveWithClear} 
            onCancel={handleCancelWithClear} 
          >
            <PunishmentFormContent 
              form={form}
              selectedIconName={selectedIconName}
              iconPreview={iconPreview}
              imagePreview={imagePreview}
              isDeleteDialogOpen={isDeleteDialogOpen}
              setIsDeleteDialogOpen={setIsDeleteDialogOpen}
              preserveHistory={preserveHistory}
              punishmentData={punishmentData}
              handleSelectIcon={handleSelectIcon}
              handleUploadIcon={handleUploadIcon}
              handleRemoveIcon={handleRemoveIcon}
              handleImageUpload={handleImageUploadWrapper}
              handleRemoveImage={handleRemoveImageWrapper}
              onCancel={handleCancelWithClear} 
              onDelete={handleDeleteWithClear} 
            />
          </PunishmentFormSubmitHandler>
        );
      }}
    </PunishmentFormProvider>
  );
};

interface PunishmentFormContentProps {
  form: UseFormReturn<PunishmentFormValues>;
  selectedIconName: string | null;
  iconPreview: string | null;
  imagePreview: string | null;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  punishmentData?: PunishmentData;
  preserveHistory?: boolean;
  handleSelectIcon: (iconName: string) => void;
  handleUploadIcon: () => void;
  handleRemoveIcon: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
  isSaving?: boolean;
}

const PunishmentFormContent: React.FC<PunishmentFormContentProps> = ({
  form,
  selectedIconName,
  iconPreview,
  imagePreview,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  punishmentData, preserveHistory = false,
  handleSelectIcon,
  handleUploadIcon,
  handleRemoveIcon,
  handleImageUpload,
  handleRemoveImage,
  onCancel,
  onDelete,
  isSaving 
}) => {
  return (
    <>
      <PunishmentBasicDetails 
        control={form.control} 
        setValue={form.setValue}
      />
      
      <PunishmentImageSection
        control={form.control}
        imagePreview={imagePreview}
        initialPosition={{ x: form.watch('focal_point_x'), y: form.watch('focal_point_y') }}
        onRemoveImage={handleRemoveImage}
        onImageUpload={handleImageUpload}
        setValue={form.setValue}
      />
      
      <PunishmentIconSection
        selectedIconName={selectedIconName}
        iconPreview={iconPreview}
        iconColor={form.watch('icon_color')}
        onSelectIcon={handleSelectIcon}
        onUploadIcon={handleUploadIcon}
        onRemoveIcon={handleRemoveIcon}
      />
      
      <PunishmentColorSettings control={form.control} />
      
      <PunishmentFormActions 
        preserveHistory={preserveHistory}
        punishmentData={punishmentData}
        isSaving={isSaving}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </>
  );
};

export default PunishmentEditorForm;
