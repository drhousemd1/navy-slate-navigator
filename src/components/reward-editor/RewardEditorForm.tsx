
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import RewardFormProvider from './RewardFormProvider';
import RewardFormLayout from './RewardFormLayout';
import RewardFormSubmitHandler from './RewardFormSubmitHandler';

interface RewardEditorFormProps {
  reward: Reward;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: number) => Promise<boolean>;
  globalCarouselTimer: NodeJS.Timeout | null;
}

const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  reward, 
  onSave, 
  onCancel, 
  onDelete,
  globalCarouselTimer
}) => {
  const rewardIndex = 0; // This would need to come from context or props

  return (
    <RewardFormProvider 
      reward={reward} 
      globalCarouselTimer={globalCarouselTimer}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
      rewardIndex={rewardIndex}
    >
      <RewardFormLayout />
      <RewardFormSubmitHandler />
    </RewardFormProvider>
  );
};

export { RewardEditorForm };
