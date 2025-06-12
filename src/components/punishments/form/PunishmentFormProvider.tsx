
import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { PunishmentData } from '@/contexts/punishments/types';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';

export const punishmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(''), // Now non-optional, defaults to empty string
  points: z.number().min(0, "Points must be 0 or greater"),
  dom_points: z.number().min(0, "Dom Points must be 0 or greater").default(0),
  dom_supply: z.number().min(0, "Supply must be 0 or greater").default(0),
  icon_color: z.string().default('#ea384c'), // Made default explicit, was optional
  title_color: z.string().default('#FFFFFF'),
  subtext_color: z.string().default('#8E9196'),
  calendar_color: z.string().default('#ea384c'),
  highlight_effect: z.boolean().default(false),
  background_opacity: z.number().min(0).max(100).default(50),
  focal_point_x: z.number().min(0).max(100).default(50),
  focal_point_y: z.number().min(0).max(100).default(50),
  background_image_url: z.string().optional(),
  image_meta: z.any().optional(),
});

export type PunishmentFormValues = z.infer<typeof punishmentFormSchema>;

interface PunishmentFormProviderProps {
  punishmentData?: PunishmentData;
  children: (
    form: UseFormReturn<PunishmentFormValues>,
    clearPersistedState: () => Promise<void>
  ) => React.ReactNode;
  formBaseId: string;
  persisterExclude?: (keyof PunishmentFormValues)[];
}

const PunishmentFormProvider: React.FC<PunishmentFormProviderProps> = ({
  punishmentData,
  children,
  formBaseId,
  persisterExclude
}) => {
  const form = useForm<PunishmentFormValues>({
    resolver: zodResolver(punishmentFormSchema),
    defaultValues: {
      title: punishmentData?.title || '',
      description: punishmentData?.description ?? '', // Use ?? for existing data, schema handles new
      points: punishmentData?.points ?? 5, // Use ?? for existing data
      dom_points: punishmentData?.dom_points ?? Math.ceil((punishmentData?.points || 5) / 2) ?? 2, // Use ??
      dom_supply: punishmentData?.dom_supply ?? 0,
      icon_color: punishmentData?.icon_color ?? '#ea384c', // Use ??
      title_color: punishmentData?.title_color ?? '#FFFFFF', // Use ??
      subtext_color: punishmentData?.subtext_color ?? '#8E9196', // Use ??
      calendar_color: punishmentData?.calendar_color ?? '#ea384c', // Use ??
      highlight_effect: punishmentData?.highlight_effect ?? false, // Use ??
      background_opacity: punishmentData?.background_opacity ?? 50, // Use ??
      focal_point_x: punishmentData?.focal_point_x ?? 50, // Use ??
      focal_point_y: punishmentData?.focal_point_y ?? 50, // Use ??
      background_image_url: punishmentData?.background_image_url || undefined,
      image_meta: punishmentData?.image_meta || undefined,
    }
  });

  const persisterFormId = `${formBaseId}-${punishmentData?.id || 'new'}`;
  const { clearPersistedState: originalClearPersistedState } = useFormStatePersister<PunishmentFormValues>(
    persisterFormId,
    form,
    {
      exclude: persisterExclude ?? []
    }
  );

  const clearPersistedStateForChild = async (): Promise<void> => {
    await originalClearPersistedState();
  };

  return (
    <Form {...form}>
      {children(form, clearPersistedStateForChild)}
    </Form>
  );
};

export default PunishmentFormProvider;
