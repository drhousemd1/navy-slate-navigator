
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { Reward, RewardFormValues } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { UseFormReturn } from 'react-hook-form';

interface RewardFormSubmitHandlerProps {
  rewardData?: Reward;
  form: UseFormReturn<RewardFormValues>;
  selectedIconName: string | null;
  imagePreview: string | null;
  iconPreview: string | null;
  onSave: (data: RewardFormValues) => Promise<Reward>;
  onCancel: () => void;
  children: React.ReactNode;
}

const mapRewardDataToFormValues = (reward: Reward): RewardFormValues => {
  return {
    title: reward.title,
    description: reward.description || '',
    cost: reward.cost,
    is_dom_reward: reward.is_dom_reward ?? false,
    icon_name: reward.icon_name,
    icon_color: reward.icon_color || '#9b87f5',
    title_color: reward.title_color || '#FFFFFF',
    subtext_color: reward.subtext_color || '#8E9196',
    calendar_color: reward.calendar_color || '#7E69AB',
    highlight_effect: reward.highlight_effect || false,
    background_image_url: reward.background_image_url,
    background_opacity: reward.background_opacity || 100,
    focal_point_x: reward.focal_point_x || 50,
    focal_point_y: reward.focal_point_y || 50,
    image_meta: reward.image_meta,
  };
};

const RewardFormSubmitHandler: React.FC<RewardFormSubmitHandlerProps> = ({
  rewardData,
  form,
  selectedIconName,
  imagePreview,
  iconPreview,
  onSave,
  onCancel,
  children
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async (values: RewardFormValues) => {
    if (isSaving) {
      logger.debug("Form submission prevented - already saving");
      return;
    }
    logger.debug("Form submitted with values:", values);
    
    const dataToSave: RewardFormValues = {
      ...values,
      icon_name: selectedIconName,
      background_image_url: imagePreview,
    };
    
    logger.debug("Attempting to save reward data:", dataToSave);
    
    try {
      setIsSaving(true);
      const savedReward = await onSave(dataToSave);
      
      if (savedReward) {
        form.reset(mapRewardDataToFormValues(savedReward));
      }
    } catch (e: unknown) {
      logger.error("Error saving reward in form handler:", e);
      // Error handling is done by the mutation hooks
    } finally {
      setIsSaving(false);
    }
  };

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { isSaving });
    }
    return child;
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {childrenWithProps}
      </form>
    </Form>
  );
};

export default RewardFormSubmitHandler;
