
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
      
      const dataToSave: PunishmentData = {
        ...values,
        icon_name: icon_name,
        background_image_url: background_image_url,
        icon_color: values.icon_color || '#ea384c' // Ensure icon_color always has a value
      };
      
      if (punishmentData?.id) {
        dataToSave.id = punishmentData.id;
      }
      
      // Save the data
      await onSave(dataToSave);
      
      // Success notification
      toast({
        title: "Success",
        description: punishmentData?.id ? "Punishment updated successfully" : "Punishment created successfully",
      });
      
      // Close the form
      onCancel();
      
      // Reset form after everything else is done
      form.reset();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {children}
      </form>
    </Form>
  );
};

export default PunishmentFormSubmitHandler;
