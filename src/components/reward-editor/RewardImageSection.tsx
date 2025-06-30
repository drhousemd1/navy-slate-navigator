
import React from 'react';
import { useRewardForm } from './RewardFormProvider';
import BackgroundImageSelectorComponent from '@/components/task-editor/BackgroundImageSelector';

interface RewardImageSectionProps {
  imagePreview: string | null;
  initialPosition?: { x: number; y: number };
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RewardImageSection: React.FC<RewardImageSectionProps> = (props) => {
  const { form } = useRewardForm();
  
  return (
    <BackgroundImageSelectorComponent 
      control={form.control}
      setValue={form.setValue}
      {...props}
    />
  );
};

export default RewardImageSection;
