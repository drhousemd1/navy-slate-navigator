
import React, { useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { Reward, RewardFormValues } from '@/data/rewards/types';
import { logger } from '@/lib/logger';

const rewardFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  cost: z.number().min(0, 'Cost must be positive'),
  supply: z.number().min(0, 'Supply must be non-negative'),
  is_dom_reward: z.boolean(),
  icon_name: z.string().nullable(),
  icon_color: z.string(),
  title_color: z.string(),
  subtext_color: z.string(),
  calendar_color: z.string(),
  highlight_effect: z.boolean(),
  background_image_url: z.string().nullable(),
  background_opacity: z.number().min(0).max(100),
  focal_point_x: z.number().min(0).max(100),
  focal_point_y: z.number().min(0).max(100),
  image_meta: z.any().nullable(),
});

interface RewardFormProviderProps {
  children: (props: {
    form: UseFormReturn<RewardFormValues>;
    clearPersistedState: () => Promise<boolean>;
  }) => React.ReactNode;
  rewardData?: Reward;
}

export const RewardFormProvider: React.FC<RewardFormProviderProps> = ({
  children,
  rewardData,
}) => {
  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    shouldFocusError: false,
    defaultValues: {
      title: '',
      description: '',
      cost: 10,
      supply: 0,
      is_dom_reward: false,
      icon_name: null,
      icon_color: '#9b87f5',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      background_image_url: null,
      background_opacity: 100,
      focal_point_x: 50,
      focal_point_y: 50,
      image_meta: null,
    }
  });

  const persisterFormId = `reward-editor-${rewardData?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: ['background_image_url', 'image_meta']
  });

  useEffect(() => {
    if (rewardData) {
      const isDomRewardValue = rewardData.is_dom_reward ?? false;
      
      form.reset({
        title: rewardData.title || '',
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        supply: rewardData.supply || 0,
        is_dom_reward: isDomRewardValue,
        icon_name: rewardData.icon_name || null,
        icon_color: rewardData.icon_color || '#9b87f5',
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        highlight_effect: rewardData.highlight_effect || false,
        background_image_url: rewardData.background_image_url || null,
        background_opacity: rewardData.background_opacity || 100,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
        image_meta: rewardData.image_meta || null,
      });
      
      logger.debug("RewardFormProvider initialized with data:", rewardData);
    } else {
      form.reset({
        title: '', description: '', cost: 10, supply: 0, is_dom_reward: false, icon_name: null,
        icon_color: '#9b87f5', title_color: '#FFFFFF', subtext_color: '#8E9196',
        calendar_color: '#7E69AB', highlight_effect: false, background_image_url: null,
        background_opacity: 100, focal_point_x: 50, focal_point_y: 50, image_meta: null,
      });
    }
  }, [rewardData, form]);

  return (
    <>
      {children({ form, clearPersistedState })}
    </>
  );
};
