import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/PunishmentsContext';
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentBackgroundSection from './form/PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';
import PunishmentFormProvider, { PunishmentFormValues } from './form/PunishmentFormProvider';
import PunishmentFormSubmitHandler from './form/PunishmentFormSubmitHandler';
import { usePunishmentIcon } from './hooks/usePunishmentIcon';
import { usePunishmentBackground } from './hooks/usePunishmentBackground';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/lib/logger';

interface PunishmentEditorFormProps {
  punishmentData?: PunishmentData;
  onSave: (data: Partial<PunishmentData>) => Promise<PunishmentData>; // Updated to always return PunishmentData
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const PunishmentEditorForm: React.FC<PunishmentEditorFormProps> = ({
  punishmentData,
  onSave,
  onCancel,
  onDelete
}) => {
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
  } = usePunishmentIcon(punishmentData?.icon_name || undefined);
  
  const {
    imagePreview,
    handleImageUpload,
    handleRemoveImage,
    setImagePreview
  } = usePunishmentBackground(punishmentData?.background_image_url);

  useEffect(() => {
    if (punishmentData) {
      setSelectedIconName(punishmentData.icon_name || null);
      if (punishmentData.icon_url) {
        setIconPreview(punishmentData.icon_url);
      } else {
        setIconPreview(null);
      }
      setImagePreview(punishmentData.background_image_url || null);
    } else {
      setSelectedIconName(null);
      setIconPreview(null);
      setImagePreview(null);
    }
  }, [punishmentData, setSelectedIconName, setImagePreview, setIconPreview]);

  return (
    <PunishmentFormProvider
      punishmentData={punishmentData}
      formBaseId="punishment-editor"
      persisterExclude={[]} 
    >
      {(form, clearPersistedState) => {
        // This function is passed to PunishmentFormSubmitHandler's onSave prop,
        // which expects: (data: Partial<PunishmentData>) => Promise<PunishmentData | null>
        const handleSaveWithClear = async (dataFromFormSubmitHandler: Partial<PunishmentData>): Promise<PunishmentData | null> => {
          try {
            // The `onSave` prop of PunishmentEditorForm now takes Partial<PunishmentData> and returns Promise<PunishmentData>
            const savedData = await onSave(dataFromFormSubmitHandler);
            await clearPersistedState();
            return savedData; // This makes the function return Promise<PunishmentData>
          } catch (error) {
            logger.error("Error saving punishment within handleSaveWithClear:", error);
            // To match the expected Promise<PunishmentData | null>, return null on error.
            // The form submit handler will see null and might not reset the form with new data.
            return null; 
          }
        };

        const handleCancelWithClear = () => {
          clearPersistedState(); 
          onCancel();
        };

        const handleDeleteWithClear = () => {
          if (onDelete && punishmentData?.id) {
            onDelete(punishmentData.id);
          }
          clearPersistedState(); 
          setIsDeleteDialogOpen(false);
        };

        return (
          <PunishmentFormSubmitHandler
            punishmentData={punishmentData}
            form={form}
            selectedIconName={selectedIconName}
            imagePreview={imagePreview}
            iconPreview={iconPreview}
            onSave={handleSaveWithClear} // handleSaveWithClear now matches expected type
            onCancel={handleCancelWithClear} 
          >
            <PunishmentFormContent 
              form={form}
              selectedIconName={selectedIconName}
              iconPreview={iconPreview}
              imagePreview={imagePreview}
              isDeleteDialogOpen={isDeleteDialogOpen}
              setIsDeleteDialogOpen={setIsDeleteDialogOpen}
              punishmentData={punishmentData}
              handleSelectIcon={handleSelectIcon}
              handleUploadIcon={handleUploadIcon}
              handleRemoveIcon={handleRemoveIcon}
              handleImageUpload={handleImageUpload}
              handleRemoveImage={handleRemoveImage}
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
  form: UseFormReturn<PunishmentFormValues>; // Use PunishmentFormValues
  selectedIconName: string | null;
  iconPreview: string | null;
  imagePreview: string | null;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  punishmentData?: PunishmentData;
  handleSelectIcon: (iconName: string) => void;
  handleUploadIcon: () => void;
  handleRemoveIcon: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

const PunishmentFormContent: React.FC<PunishmentFormContentProps> = ({
  form,
  selectedIconName,
  iconPreview,
  imagePreview,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  punishmentData,
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
      
      <PunishmentBackgroundSection
        control={form.control}
        imagePreview={imagePreview}
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
