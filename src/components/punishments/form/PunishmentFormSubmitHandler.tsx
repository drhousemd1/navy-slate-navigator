import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';

import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { PunishmentData } from '@/contexts/punishments/types';
import { PunishmentFormValues } from './PunishmentFormProvider';
import { logger } from '@/lib/logger';
import { UseFormReturn } from 'react-hook-form';

interface PunishmentFormSubmitHandlerProps {
  punishmentData?: PunishmentData;
  form: UseFormReturn<PunishmentFormValues>;
  selectedIconName: string | null;
  imagePreview: string | null;
  iconPreview: string | null;
  onSave: (data: Partial<PunishmentData>) => Promise<PunishmentData | null>;
  onCancel: () => void;
  children: React.ReactNode;
}

const mapPunishmentDataToFormValues = (punishment: PunishmentData): PunishmentFormValues => {
  return {
    title: punishment.title,
    description: punishment.description || '',
    points: punishment.points,
    dom_points: punishment.dom_points !== undefined && punishment.dom_points !== null 
                ? punishment.dom_points 
                : Math.ceil(punishment.points / 2),
    dom_supply: punishment.dom_supply ?? 0,
    icon_name: punishment.icon_url ? `custom:${punishment.icon_url}` : punishment.icon_name ?? null,
    background_image_url: punishment.background_image_url ?? null,
    image_meta: punishment.image_meta ?? null,
    icon_color: punishment.icon_color || '#ea384c',
    title_color: punishment.title_color || '#FFFFFF',
    subtext_color: punishment.subtext_color || '#8E9196',
    calendar_color: punishment.calendar_color || '#ea384c',
    highlight_effect: punishment.highlight_effect || false,
    background_opacity: punishment.background_opacity ?? 100,
    focal_point_x: punishment.focal_point_x ?? 50,
    focal_point_y: punishment.focal_point_y ?? 50,
  };
};

const PunishmentFormSubmitHandler: React.FC<PunishmentFormSubmitHandlerProps> = ({
  punishmentData,
  form,
  selectedIconName,
  imagePreview,
  iconPreview,
  onSave,
  onCancel,
  children
}) => {
  const text = useCoreTextClasses();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSubmit = async (values: PunishmentFormValues) => {
    if (isSaving) {
      logger.debug("Form submission prevented - already saving");
      return;
    }
    
    const points = Number(values.points);
    const dom_points = values.dom_points !== undefined 
      ? Number(values.dom_points)
      : Math.ceil(points / 2);
    
    const dataToSave: Partial<PunishmentData> = {
      ...values,
      points: points,
      dom_points: dom_points,
      icon_name: iconPreview ? `custom:${iconPreview}` : selectedIconName,
      background_image_url: imagePreview,
      icon_color: values.icon_color || '#ea384c',
    };
    
    if (punishmentData?.id) {
      dataToSave.id = punishmentData.id;
    }
    
    
    try {
      setIsSaving(true);
      setSaveError(null);
      const savedPunishment = await onSave(dataToSave);
      
      if (savedPunishment) {
        form.reset(mapPunishmentDataToFormValues(savedPunishment));
      }
    } catch (e: unknown) {
      logger.error("Error saving punishment in form handler:", e);
      setSaveError(e instanceof Error ? e.message : 'The punishment could not be saved. Your draft is still open.');
    } finally {
      setIsSaving(false);
    }
  };

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{ isSaving?: boolean }>, { isSaving });
    }
    return child;
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {saveError && <p role="alert" className={text.danger}>{saveError}</p>}
        {childrenWithProps}
      </form>
    </Form>
  );
};

export default PunishmentFormSubmitHandler;
