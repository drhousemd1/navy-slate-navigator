
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
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
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async (values: any) => {
    const icon_name = selectedIconName || null;
    const background_image_url = imagePreview || null;
    
    const dataToSave: PunishmentData = {
      ...values,
      icon_name: icon_name,
      background_image_url: background_image_url,
      icon_color: values.icon_color || '#ea384c'
    };
    
    if (punishmentData?.id) {
      dataToSave.id = punishmentData.id;
    }
    
    try {
      setIsSaving(true);
      await onSave(dataToSave);
      form.reset();
      onCancel();
    } catch (error) {
      console.error("Error saving punishment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Use a more type-safe approach for cloning children
  const childrenWithProps = React.Children.map(children, child => {
    // Only clone if it's a valid element
    if (React.isValidElement(child)) {
      // Pass isSaving prop to the child
      return React.cloneElement(child, { isSaving } as React.HTMLAttributes<HTMLElement>);
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

export default PunishmentFormSubmitHandler;
