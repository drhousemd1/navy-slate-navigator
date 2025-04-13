
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRewardForm } from './RewardFormProvider';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';

const RewardFormSubmitHandler: React.FC = () => {
  const { reward, onSave, rewardIndex } = useRewardForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm({
    defaultValues: {
      title: reward.title,
      description: reward.description,
      cost: reward.cost,
      // Add other fields as needed
    }
  });
  
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      toast({
        title: "Success",
        description: "Reward saved successfully",
      });
    } catch (error) {
      console.error("Error saving reward:", error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button 
        variant="primary" 
        disabled={isSubmitting}
        onClick={form.handleSubmit(handleSubmit)}
      >
        {isSubmitting ? 'Saving...' : 'Save Reward'}
      </Button>
    </div>
  );
};

export default RewardFormSubmitHandler;
