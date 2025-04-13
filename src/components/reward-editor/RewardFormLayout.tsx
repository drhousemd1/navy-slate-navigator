
import React from 'react';
import { RewardImageSelectionSection } from './RewardImageSelectionSection';
import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
}

export const RewardFormLayout: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="space-y-4">
      <RewardImageSelectionSection />
      <div className="text-right">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
};

export default RewardFormLayout;
