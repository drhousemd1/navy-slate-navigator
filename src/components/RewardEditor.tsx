
import React from 'react';
import { RewardEditorForm } from './reward-editor/RewardEditorForm';
import { Reward } from '@/lib/rewardUtils';

interface RewardEditorProps {
  reward: Reward;
  onClose: () => void;
  globalCarouselTimer: NodeJS.Timeout | null;
}

export const RewardEditor: React.FC<RewardEditorProps> = ({ reward, onClose, globalCarouselTimer }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6">
        <RewardEditorForm reward={reward} onClose={onClose} globalCarouselTimer={globalCarouselTimer} />
      </div>
    </div>
  );
};

export default RewardEditor;
