import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import PunishmentBasicDetails from './PunishmentBasicDetails';
import PunishmentIconSection from './PunishmentIconSection';
import PunishmentBackgroundSection from './PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './PunishmentFormActions';
import PunishmentFormProvider, { PunishmentFormValues } from './form/PunishmentFormProvider';
import { usePunishmentIcon } from './hooks/usePunishmentIcon';
import { usePunishmentBackground } from './hooks/usePunishmentBackground';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useForm } from 'react-hook-form';
import { ColorPickerField, PrioritySelector, BackgroundImageSelector, IconSelector, PredefinedIconsGrid } from './FormFields';

interface PunishmentEditorFormProps {
  punishmentData?: PunishmentData;
  onSave: (data: PunishmentData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: string) => void;
}

const PunishmentEditForm: React.FC<PunishmentEditorFormProps> = ({
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
      // Ensure we have all required fields
      const dataToSave: PunishmentData = {
        ...values,
        icon_name: selectedIconName,
        background_image_url: imagePreview,
        title: values.title || 'Unnamed Punishment', // Ensure title is not empty
        points: values.points || 0, // Ensure points is not undefined
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
            initialBackgroundImages={punishmentData?.background_images || []}
            initialCarouselTimer={punishmentData?.carousel_timer || 5}
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

export default PunishmentEditForm;
