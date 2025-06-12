
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelectorComponent from '@/components/task-editor/BackgroundImageSelector';
import { PunishmentFormValues } from './PunishmentFormProvider';

interface PunishmentImageSectionProps {
  control: Control<PunishmentFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<PunishmentFormValues>;
}

const PunishmentImageSection: React.FC<PunishmentImageSectionProps> = (props) => {
  return <BackgroundImageSelectorComponent {...props} />;
};

export default PunishmentImageSection;
