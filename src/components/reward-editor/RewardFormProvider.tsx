
import React from 'react';
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
  rewardData?: Reward;
  children: (
    form: UseFormReturn<RewardFormValues>,
    clearPersistedState: () => Promise<void>
  ) => React.ReactNode;
  formBaseId: string;
  persisterExclude?: (keyof RewardFormValues)[];
}

const RewardFormProvider: React.FC<RewardFormProviderProps> = ({
  rewardData,
  children,
  formBaseId,
  persisterExclude
}) => {
  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    shouldFocusError: false,
    defaultValues: {
      title: rewardData?.title || '',
      description: rewardData?.description || '',
      cost: rewardData?.cost || 10,
      is_dom_reward: rewardData?.is_dom_reward ?? false,
      icon_name: rewardData?.icon_name || null,
      icon_color: rewardData?.icon_color || '#9b87f5',
      title_color: rewardData?.title_color || '#FFFFFF',
      subtext_color: rewardData?.subtext_color || '#8E9196',
      calendar_color: rewardData?.calendar_color || '#7E69AB',
      highlight_effect: rewardData?.highlight_effect || false,
      background_image_url: rewardData?.background_image_url || null,
      background_opacity: rewardData?.background_opacity || 100,
      focal_point_x: rewardData?.focal_point_x || 50,
      focal_point_y: rewardData?.focal_point_y || 50,
      image_meta: rewardData?.image_meta || null,
    }
  });

  const persisterFormId = `${formBaseId}-${rewardData?.id || 'new'}`;
  const { clearPersistedState: originalClearPersistedState } = useFormStatePersister<RewardFormValues>(
    persisterFormId,
    form,
    {
      exclude: persisterExclude ?? []
    }
  );

  const clearPersistedStateForChild = async (): Promise<void> => {
    await originalClearPersistedState();
  };

  return children(form, clearPersistedStateForChild);
};

export default RewardFormProvider;
