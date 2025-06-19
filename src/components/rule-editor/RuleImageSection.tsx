
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { RuleFormValues } from '@/data/rules/types';

interface RuleImageSectionProps {
  control: Control<RuleFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RuleFormValues>;
}

const RuleImageSection: React.FC<RuleImageSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  onImageUpload,
  setValue
}) => {
  return (
    <BackgroundImageSelector
      control={control}
      imagePreview={imagePreview}
      initialPosition={initialPosition}
      onRemoveImage={onRemoveImage}
      onImageUpload={onImageUpload}
      setValue={setValue}
    />
  );
};

export default RuleImageSection;
