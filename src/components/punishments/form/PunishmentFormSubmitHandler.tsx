
import React from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { PunishmentData } from '@/contexts/PunishmentsContext';

interface PunishmentFormSubmitHandlerProps {
  punishmentData?: PunishmentData;
  form: any;
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
  const onSubmit = async (values: any) => {
    try {
      const icon_name = selectedIconName || null;
      const background_image_url = imagePreview || null;
      
      // Make sure we get all form values including the icon_color
      const dataToSave: PunishmentData = {
        ...values,
        icon_name: icon_name,
        background_image_url: background_image_url,
      };
      
      // Log data to help debug
      console.log("Submitting punishment with data:", dataToSave);
      
      // If editing, include the id
      if (punishmentData?.id) {
        dataToSave.id = punishmentData.id;
      }
      
      await onSave(dataToSave);
      form.reset();
      toast({
        title: "Success",
        description: "Punishment saved successfully!",
      });
      onCancel();
    } catch (error) {
      console.error("Error saving punishment:", error);
      toast({
        title: "Error",
        description: "Failed to save punishment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {children}
    </form>
  );
};

export default PunishmentFormSubmitHandler;
