
import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentBackgroundSection from './form/PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';
import PunishmentFormProvider, { PunishmentFormValues } from './form/PunishmentFormProvider';
import { usePunishmentIcon } from './hooks/usePunishmentIcon';
import { usePunishmentBackground } from './hooks/usePunishmentBackground';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useForm } from 'react-hook-form';

interface PunishmentEditorFormProps {
  punishmentData?: PunishmentData;
  onSave: (data: PunishmentData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: string) => void;
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
    setSelectedIconName
  } = usePunishmentIcon(punishmentData?.icon_name);

  const {
    imagePreview,
    handleImageUpload,
    handleRemoveImage,
    setImagePreview
  } = usePunishmentBackground(punishmentData?.background_image_url);

  useEffect(() => {
    if (punishmentData) {
      if (punishmentData.icon_name) {
        setSelectedIconName(punishmentData.icon_name);
      }

      if (punishmentData.background_image_url) {
        setImagePreview(punishmentData.background_image_url);
      }
    }
  }, [punishmentData, setSelectedIconName, setImagePreview]);

  const handleFormSubmit = async (values: PunishmentFormValues) => {
    try {
      const dataToSave: PunishmentData = {
        ...values,
        icon_name: selectedIconName,
        background_image_url: imagePreview,
      };
      
      if (punishmentData?.id) {
        dataToSave.id = punishmentData.id;
      }
      
      await onSave(dataToSave);
    } catch (error) {
      console.error("Error saving punishment:", error);
    }
  };

  return (
    <PunishmentFormProvider punishmentData={punishmentData}>
      {(form) => (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <PunishmentBasicDetails 
            control={form.control}
            setValue={form.setValue}
          />
          
          <PunishmentIconSection
            selectedIconName={selectedIconName}
            iconPreview={iconPreview}
            iconColor={form.watch('icon_color') || '#ea384c'}
            onSelectIcon={handleSelectIcon}
            onUploadIcon={handleUploadIcon}
            onRemoveIcon={handleRemoveIcon}
          />
          
          <PunishmentBackgroundSection
            control={form.control}
            imagePreview={imagePreview}
            onRemoveImage={handleRemoveImage}
            onImageUpload={handleImageUpload}
            setValue={form.setValue}
            watch={form.watch}
            initialBackgroundImages={punishmentData?.background_images}
            initialCarouselTimer={punishmentData?.carousel_timer}
          />
          
          <PunishmentColorSettings control={form.control} />
          
          <PunishmentFormActions
            punishmentData={punishmentData}
            loading={false}
            isDeleteDialogOpen={isDeleteDialogOpen}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        </form>
      )}
    </PunishmentFormProvider>
  );
};

export default PunishmentEditorForm;
