
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';
import BackgroundImageSelectorComponent from '@/components/task-editor/BackgroundImageSelector';

interface RewardImageSectionProps {
  control: Control<RewardFormValues>;
  setValue: UseFormSetValue<RewardFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RewardImageSection: React.FC<RewardImageSectionProps> = (props) => {
  return (
    <BackgroundImageSelectorComponent 
      {...props}
    />
  );
};

export default RewardImageSection;
