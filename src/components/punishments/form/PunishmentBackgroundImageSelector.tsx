
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelectorComponent, { BackgroundImageFormFields } from '@/components/task-editor/BackgroundImageSelector';
import { PunishmentFormValues } from './PunishmentFormProvider';

// Ensure PunishmentFormValues is compatible with BackgroundImageFormFields

interface PunishmentBackgroundImageSelectorProps {
  control: Control<PunishmentFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<PunishmentFormValues>;
}

// Assign the generic component with its type argument to a new constant
const SpecificPunishmentBackgroundImageSelector = BackgroundImageSelectorComponent<PunishmentFormValues>;

const PunishmentBackgroundImageSelector: React.FC<PunishmentBackgroundImageSelectorProps> = (props) => {
  // Use the new constant in JSX, which does not have explicit generic syntax here
  return <SpecificPunishmentBackgroundImageSelector {...props} />;
};

export default PunishmentBackgroundImageSelector;
