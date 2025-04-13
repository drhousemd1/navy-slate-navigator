
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const RewardImageSelectionSection: React.FC = () => {
  return (
    <div>
      <Label className="block mb-2 font-medium">Reward Background Image</Label>
      <Input type="file" accept="image/*" />
    </div>
  );
};

export default RewardImageSelectionSection;
