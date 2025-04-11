import React from 'react';
import { useForm } from 'react-hook-form';
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
import { useModalImageHandling } from './hooks/useModalImageHandling';

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
  const methods = useForm();

  const {
    imageSlots,
    selectedBoxIndex,
    handleImageUpload,
    handleRemoveImage,
    handleSelectBox,
    carouselTimer,
    setCarouselTimer,
    position,
    setValue
  } = useModalImageHandling({
    initialImages: punishmentData?.background_images,
    initialTimer: punishmentData?.carousel_timer,
    initialPosition: {
      x: punishmentData?.focal_point_x ?? 50,
      y: punishmentData?.focal_point_y ?? 50
    }
  });

  const {
    selectedIconName,
    iconPreview,
    handleSelectIcon,
    handleUploadIcon,
    handleRemoveIcon,
    setSelectedIconName
  } = usePunishmentIcon(punishmentData?.icon_name);

  return (
    <PunishmentFormProvider
      punishmentData={punishmentData}
      onSave={onSave}
      onCancel={onCancel}
    >
      <PunishmentFormLayout>
        <PunishmentBasicDetails />
        <PunishmentIconSection
          iconPreview={iconPreview}
          selectedIconName={selectedIconName}
          onIconUpload={handleUploadIcon}
          onIconRemove={handleRemoveIcon}
          onIconSelect={handleSelectIcon}
        />
        <PunishmentBackgroundSection
          control={methods.control}
          imageSlots={imageSlots}
          selectedBoxIndex={selectedBoxIndex}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onSelectImageSlot={handleSelectBox}
          carouselTimer={carouselTimer}
          onCarouselTimerChange={setCarouselTimer}
          setValue={setValue}
          position={position}
        />
        <PunishmentColorSettings />
        <PunishmentFormActions
          onCancel={onCancel}
          onDelete={onDelete}
          setIsDeleteDialogOpen={() => {}}
        />
        <PunishmentFormSubmitHandler />
      </PunishmentFormLayout>
    </PunishmentFormProvider>
  );
};

export default PunishmentEditorForm;