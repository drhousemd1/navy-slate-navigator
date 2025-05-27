
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector, { BackgroundImageFormFields } from '@/components/task-editor/BackgroundImageSelector';
import { PunishmentFormValues } from './PunishmentFormProvider';

// Ensure PunishmentFormValues is compatible with BackgroundImageFormFields
// This is implicitly true if PunishmentFormValues includes background_opacity, focal_point_x, focal_point_y
// or if BackgroundImageSelector handles their potential absence gracefully.
// Given the BackgroundImageFormFields interface, these fields are optional.

interface PunishmentBackgroundImageSelectorProps {
  control: Control<PunishmentFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<PunishmentFormValues>;
}

const PunishmentBackgroundImageSelector: React.FC<PunishmentBackgroundImageSelectorProps> = (props) => {
  return <BackgroundImageSelector<PunishmentFormValues> {...props} />;
};

export default PunishmentBackgroundImageSelector;
