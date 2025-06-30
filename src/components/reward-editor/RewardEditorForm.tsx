
import React from 'react';
import { RewardFormProvider } from './RewardFormProvider';
import { RewardFormSubmitHandler } from './RewardFormSubmitHandler';
import { RewardFormLayout } from './RewardFormLayout';
import { Reward, RewardFormValues } from '@/data/rewards/types';

interface RewardEditorFormProps {
  rewardData?: Reward;
  onSave: (formData: RewardFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
}

export const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  rewardData, 
  onSave, 
  onCancel,
  onDelete,
  isSaving = false
}) => {
  return (
    <RewardFormProvider rewardData={rewardData}>
      <RewardFormSubmitHandler onSave={onSave} onCancel={onCancel}>
        <RewardFormLayout
          rewardData={rewardData}
          onDelete={onDelete}
          isSaving={isSaving}
        />
      </RewardFormSubmitHandler>
    </RewardFormProvider>
  );
};
