import React, { useEffect } from 'react';
import { PunishmentData } from '@/contexts/PunishmentsContext';
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentBackgroundSection from './form/PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';
import PunishmentFormProvider from './form/PunishmentFormProvider';
import PunishmentFormSubmitHandler from './form/PunishmentFormSubmitHandler';
import { usePunishmentIcon } from './hooks/usePunishmentIcon';
import { usePunishmentBackground } from './hooks/usePunishmentBackground';
import { useDeleteDialog } from './hooks/useDeleteDialog';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { UseFormReturn } from 'react-hook-form';

interface PunishmentEditorFormProps {
  punishmentData?: PunishmentData;
  onSave: (data: PunishmentData) => Promise<void>;
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
  } = usePunishmentIcon(punishmentData?.icon_name || undefined); // Pass undefined if null
  
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
        setIconPreview(null); // Reset if no icon_url
      }
      setImagePreview(punishmentData.background_image_url || null);
    } else {
      setSelectedIconName(null);
      setIconPreview(null);
      setImagePreview(null);
    }
  }, [punishmentData, setSelectedIconName, setImagePreview, setIconPreview]);

  return (
    <PunishmentFormProvider punishmentData={punishmentData}>
      {(form) => {
        const persisterFormId = `punishment-editor-${punishmentData?.id || 'new'}`;
        
        const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
          exclude: [] 
        });

        const handleSaveWithClear = async (dataToSave: PunishmentData) => {
          await onSave(dataToSave);
          await clearPersistedState();
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
            iconPreview={iconPreview} // Ensure this prop is accepted by PunishmentFormSubmitHandler if needed
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
  form: UseFormReturn<any>; // Changed from any to UseFormReturn
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
  onDelete?: () => void; // onDelete is optional here
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
        imagePreview={imagePreview} // This is the state variable from usePunishmentBackground
        onRemoveImage={handleRemoveImage}
        onImageUpload={handleImageUpload}
        setValue={form.setValue}
      />
      
      <PunishmentIconSection
        selectedIconName={selectedIconName}
        iconPreview={iconPreview} // This is the state variable from usePunishmentIcon
        iconColor={form.watch('icon_color')}
        onSelectIcon={handleSelectIcon}
        onUploadIcon={handleUploadIcon}
        onRemoveIcon={handleRemoveIcon}
        // Pass setValue if PunishmentIconSection needs to update form.icon_url directly
        // setValue={form.setValue} 
      />
      
      <PunishmentColorSettings control={form.control} />
      
      <PunishmentFormActions 
        punishmentData={punishmentData}
        isSaving={isSaving} // Pass down isSaving if form is externally controlled for submission state
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        onCancel={onCancel} // This onCancel is already clear-wrapped
        onDelete={onDelete} // This onDelete is already clear-wrapped
      />
    </>
  );
};

export default PunishmentEditorForm;
