
import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
}

export const RewardFormSubmitHandler: React.FC<Props> = ({ onClose }) => {
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
