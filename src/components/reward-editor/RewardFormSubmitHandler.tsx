
import React from 'react';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { RewardFormValues } from '@/data/rewards/types';
import { logger } from '@/lib/logger';

interface RewardFormSubmitHandlerProps {
  children: React.ReactNode;
  form: UseFormReturn<RewardFormValues>;
  clearPersistedState: () => Promise<boolean>;
  onSave: (formData: RewardFormValues) => Promise<void>;
  onCancel: () => void;
}

export const RewardFormSubmitHandler: React.FC<RewardFormSubmitHandlerProps> = ({
  children,
  form,
  clearPersistedState,
  onSave,
  onCancel,
}) => {
  const onSubmitWrapped = async (data: RewardFormValues) => {
    try {
      logger.debug("RewardFormSubmitHandler handling save with data:", data);
      await onSave(data);
      const cleared = await clearPersistedState();
      logger.debug("Persisted state cleared:", cleared);
    } catch (error) {
      logger.error("Error during onSave callback:", error);
      throw error;
    }
  };

  const handleCancelWrapped = async () => {
    const cleared = await clearPersistedState();
    logger.debug("Persisted state cleared on cancel:", cleared);
    onCancel();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitWrapped)} className="space-y-6">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              onCancel: handleCancelWrapped,
            } as any);
          }
          return child;
        })}
      </form>
    </Form>
  );
};
