
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelectorComponent from '@/components/task-editor/BackgroundImageSelector';
import { RewardFormValues } from '@/data/rewards/types';

interface RewardImageSectionProps {
  control: Control<RewardFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardFormValues>;
}

const RewardImageSection: React.FC<RewardImageSectionProps> = (props) => {
  return <BackgroundImageSelectorComponent {...props} />;
};

export default RewardImageSection;
