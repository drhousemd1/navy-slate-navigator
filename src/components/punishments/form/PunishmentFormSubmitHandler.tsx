
import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '../../PunishmentEditor';
import { PunishmentFormValues } from './PunishmentFormProvider';

interface PunishmentFormSubmitHandlerProps {
  punishmentData?: PunishmentData;
  form: UseFormReturn<PunishmentFormValues>;
  selectedIconName: string | null;
  imagePreview: string | null;
  onSave: (data: PunishmentData) => Promise<void>;
  onCancel: () => void;
  children: React.ReactNode;
}

const PunishmentFormSubmitHandler: React.FC<PunishmentFormSubmitHandlerProps> = ({
  punishmentData,
  form,
  selectedIconName,
  imagePreview,
  onSave,
  onCancel,
  children
}) => {
  const [loading, setLoading] = useState(false);
  const { createPunishment, updatePunishment } = usePunishments();

  const handleSubmit = async (values: PunishmentFormValues) => {
    setLoading(true);
    
    try {
      console.log("Submitting form with values:", values);
      console.log("Background image:", imagePreview);
      
      const processedValues: PunishmentData = {
        title: values.title,
        points: values.points,
        description: values.description,
        icon_name: selectedIconName || undefined,
        icon_color: values.icon_color,
        title_color: values.title_color,
        subtext_color: values.subtext_color,
        calendar_color: values.calendar_color,
        highlight_effect: values.highlight_effect,
        background_image_url: imagePreview || undefined,
        background_opacity: values.background_opacity,
        focal_point_x: values.focal_point_x,
        focal_point_y: values.focal_point_y,
      };
      
      console.log("Processed values to save:", processedValues);
      
      if (punishmentData?.id) {
        await updatePunishment(punishmentData.id, processedValues);
      } else {
        await createPunishment(processedValues);
      }
      
      await onSave(processedValues);
      
      toast({
        title: punishmentData?.id ? "Punishment Updated" : "Punishment Created",
        description: `Your punishment has been ${punishmentData?.id ? "updated" : "created"} successfully.`,
      });
      
      onCancel();
      
    } catch (error) {
      console.error('Error saving punishment:', error);
      toast({
        title: "Error",
        description: "Failed to save punishment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {children}
    </form>
  );
};

export default PunishmentFormSubmitHandler;
