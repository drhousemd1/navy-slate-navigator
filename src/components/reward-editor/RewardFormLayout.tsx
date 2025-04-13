
import React from 'react';
import { useRewardForm } from './RewardFormProvider';
import RewardImageSelectionSection from './RewardImageSelectionSection';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { X } from 'lucide-react';

const RewardFormLayout: React.FC = () => {
  const { onCancel } = useRewardForm();
  
  return (
    <Form>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Basic Details</h3>
            {/* Title, Description, and Cost fields would go here */}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Appearance</h3>
            <RewardImageSelectionSection />
            {/* Icon selection would go here */}
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          {/* Delete button would be conditionally shown here */}
        </div>
      </div>
    </Form>
  );
};

export default RewardFormLayout;
