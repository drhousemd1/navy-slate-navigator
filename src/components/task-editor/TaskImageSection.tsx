
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { handleImageUpload } from '@/utils/image/taskIntegration';

interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  priority: 'low' | 'medium' | 'high';
  image_meta?: any;
}

interface TaskImageSectionProps {
  control: Control<TaskFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<TaskFormValues>;
}

const TaskImageSection: React.FC<TaskImageSectionProps> = ({
  control,
  imagePreview,
  initialPosition,
  onRemoveImage,
  setValue
}) => {
  const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await handleImageUpload(
          file,
          setValue,
          (url: string | null) => {
            // This will be handled by the parent component's state
          }
        );
      } catch (error) {
        console.error('Error handling image upload:', error);
      }
    }
  };

  return (
    <BackgroundImageSelector
      control={control}
      imagePreview={imagePreview}
      initialPosition={initialPosition}
      onRemoveImage={onRemoveImage}
      onImageUpload={handleImageUploadWrapper}
      setValue={setValue}
    />
  );
};

export default TaskImageSection;
