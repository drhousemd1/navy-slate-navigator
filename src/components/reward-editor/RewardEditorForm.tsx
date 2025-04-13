
import React from 'react';
import { Reward } from '@/lib/rewardUtils';
import { RewardFormProvider } from './RewardFormProvider';
import { RewardFormSubmitHandler } from './RewardFormSubmitHandler';
import RewardBasicDetails from './RewardBasicDetails';
import RewardBackgroundSection from './RewardBackgroundSection';
import RewardIconSection from './RewardIconSection';
import RewardColorSettings from './RewardColorSettings';
import { RewardImageSelectionSection } from './RewardImageSelectionSection';
import RewardFormActions from './RewardFormActions';

interface RewardEditorFormProps {
  reward: Reward;
  onClose: () => void;
  globalCarouselTimer: NodeJS.Timeout | null;
  onSave: (data: any, index: number) => Promise<Reward>;
  onDelete: (index: number) => Promise<boolean>;
}

export const RewardEditorForm: React.FC<RewardEditorFormProps> = ({
  reward,
  onClose,
  globalCarouselTimer,
  onSave,
  onDelete,
}) => {
  return (
    <RewardFormProvider reward={reward} globalCarouselTimer={globalCarouselTimer}>
      <form className="space-y-4">
        <RewardBasicDetails />
        <RewardIconSection />
        <RewardColorSettings />
        <RewardBackgroundSection />
        <RewardImageSelectionSection />
        <RewardFormActions onClose={onClose} />
        <RewardFormSubmitHandler onClose={onClose} onSave={onSave} onDelete={onDelete} />
      </form>
    </RewardFormProvider>
  );
};

export default RewardEditorForm;
