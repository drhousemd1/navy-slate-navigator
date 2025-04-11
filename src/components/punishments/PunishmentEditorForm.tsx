import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/PunishmentsContext';
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

  return (
    <PunishmentFormProvider punishmentData={punishmentData}>
      <PunishmentFormLayout>
        <PunishmentBasicDetails />
        <PunishmentIconSection
          iconPreview={iconPreview}
          selectedIconName={selectedIconName}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />
        <PunishmentBackgroundSection />
        <PunishmentColorSettings />
        <PunishmentFormActions
          onCancel={onCancel}
          onDelete={onDelete}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        />
        <PunishmentFormSubmitHandler onSave={onSave} />
      </PunishmentFormLayout>
    </PunishmentFormProvider>
  );
};

export default PunishmentEditorForm;