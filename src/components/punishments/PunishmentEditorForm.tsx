
import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentBackgroundSection from './form/PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';
import PunishmentFormProvider from './form/PunishmentFormProvider';
import PunishmentFormSubmitHandler from './form/PunishmentFormSubmitHandler';
import PunishmentFormLayout from './form/PunishmentFormLayout';
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

  const form = useForm({
    defaultValues: {
      title: punishmentData?.title || '',
      description: punishmentData?.description || '',
      points: punishmentData?.points || 5,
      icon_color: punishmentData?.icon_color || '#ea384c',
      title_color: punishmentData?.title_color || '#FFFFFF',
      subtext_color: punishmentData?.subtext_color || '#8E9196',
      calendar_color: punishmentData?.calendar_color || '#ea384c',
      highlight_effect: punishmentData?.highlight_effect || false,
      background_opacity: punishmentData?.background_opacity || 50,
      focal_point_x: punishmentData?.focal_point_x || 50,
      focal_point_y: punishmentData?.focal_point_y || 50,
    }
  });

  const handleFormSubmit = async (values: any) => {
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
    </PunishmentFormProvider>
  );
};

export default PunishmentEditorForm;
