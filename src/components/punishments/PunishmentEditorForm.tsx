
import React, { useState, useEffect } from 'react';
import { PunishmentData } from '../PunishmentEditor';
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentBackgroundSection from './form/PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';
import PunishmentFormProvider from './form/PunishmentFormProvider';
import PunishmentFormSubmitHandler from './form/PunishmentFormSubmitHandler';
import { usePunishmentIcon } from './hooks/usePunishmentIcon';
import { usePunishmentBackground } from './hooks/usePunishmentBackground';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
      console.log("Setting form data from punishmentData:", punishmentData);
      
      if (punishmentData.icon_name) {
        setSelectedIconName(punishmentData.icon_name);
      }
      
      if (punishmentData.background_image_url) {
        setImagePreview(punishmentData.background_image_url);
      }
    }
  }, [punishmentData, setSelectedIconName, setImagePreview]);

  return (
    <PunishmentFormProvider punishmentData={punishmentData}>
      {(form) => (
        <PunishmentFormSubmitHandler
          punishmentData={punishmentData}
          form={form}
          selectedIconName={selectedIconName}
          imagePreview={imagePreview}
          onSave={onSave}
          onCancel={onCancel}
        >
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
            loading={false}
            isDeleteDialogOpen={isDeleteDialogOpen}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        </PunishmentFormSubmitHandler>
      )}
    </PunishmentFormProvider>
  );
};

export default PunishmentEditorForm;
