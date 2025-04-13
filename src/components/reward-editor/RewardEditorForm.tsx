
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import { RewardFormProvider } from './RewardFormProvider';
import { RewardFormLayout } from './RewardFormLayout';
import { RewardFormSubmitHandler } from './RewardFormSubmitHandler';

interface RewardEditorFormProps {
  reward: Reward;
  onClose: () => void;
  globalCarouselTimer: NodeJS.Timeout | null;
}

export const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ reward, onClose, globalCarouselTimer }) => {
  return (
    <RewardFormProvider reward={reward} globalCarouselTimer={globalCarouselTimer}>
      <RewardFormLayout onClose={onClose} />
      <RewardFormSubmitHandler onClose={onClose} />
    </RewardFormProvider>
  );
};

export default RewardEditorForm;
