
import React from 'react';
import { Button } from '@/components/ui/button';
import { Reward } from '@/lib/rewardUtils';

interface Props {
  onClose: () => void;
  onSave: (data: any, index: number) => Promise<Reward>;
  onDelete: (index: number) => Promise<boolean>;
}

export const RewardFormSubmitHandler: React.FC<Props> = ({ onClose, onSave, onDelete }) => {
  const handleSubmit = () => {
    // Replace with actual save logic
    onClose();
  };

  return (
    <div className="mt-4 text-right">
      <Button variant="default" onClick={handleSubmit}>Save</Button>
    </div>
  );
};

export default RewardFormSubmitHandler;
