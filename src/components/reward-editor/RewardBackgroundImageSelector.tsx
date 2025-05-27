
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelector, { BackgroundImageFormFields } from '@/components/task-editor/BackgroundImageSelector';
import { RewardFormValues } from '@/data/rewards/types';

// Ensure RewardFormValues is compatible with BackgroundImageFormFields

interface RewardBackgroundImageSelectorProps {
  control: Control<RewardFormValues>;
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<RewardFormValues>;
}

const RewardBackgroundImageSelector: React.FC<RewardBackgroundImageSelectorProps> = (props) => {
  return <BackgroundImageSelector<RewardFormValues> {...props} />;
};

export default RewardBackgroundImageSelector;
