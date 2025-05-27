
import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import BackgroundImageSelectorComponent, { BackgroundImageFormFields } from '@/components/task-editor/BackgroundImageSelector';
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

// Assign the generic component with its type argument to a new constant
const SpecificRewardBackgroundImageSelector = BackgroundImageSelectorComponent<RewardFormValues>;

const RewardBackgroundImageSelector: React.FC<RewardBackgroundImageSelectorProps> = (props) => {
  // Use the new constant in JSX, which does not have explicit generic syntax here
  return <SpecificRewardBackgroundImageSelector {...props} />;
};

export default RewardBackgroundImageSelector;
