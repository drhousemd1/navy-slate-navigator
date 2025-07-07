
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { LocalTaskFormValues } from './TaskFormProvider';

interface TaskImageSectionProps {
  control: Control<LocalTaskFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<LocalTaskFormValues>;
}

const TaskImageSection: React.FC<TaskImageSectionProps> = ({
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

export default TaskImageSection;
