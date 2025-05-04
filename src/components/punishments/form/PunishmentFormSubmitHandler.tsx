
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
    console.log("Form submitted with values:", values);
    // Make sure we're using exact primitive values, not references
    const icon_name = selectedIconName || null;
    const background_image_url = imagePreview || null;
    
    // Force explicit assignment of dom_points with Number() constructor to ensure number type
    const points = Number(values.points);
    const dom_points = values.dom_points !== undefined 
      ? Number(values.dom_points)
      : Math.ceil(points / 2);
    
    console.log("Calculated dom_points:", dom_points, "from points:", points);
    
    const dataToSave: PunishmentData = {
      ...values,
      points: points,
      dom_points: dom_points,
      icon_name: icon_name,
      background_image_url: background_image_url,
      icon_color: values.icon_color || '#ea384c'
    };
    
    if (punishmentData?.id) {
      dataToSave.id = punishmentData.id;
    }
    
    console.log("Saving punishment data:", dataToSave);
    
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

  // Clone children to pass isSaving prop
  const childrenWithProps = React.Children.map(children, child => {
    // Only clone if it's a valid element
    if (React.isValidElement(child)) {
      // Pass isSaving prop to the child
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

export default PunishmentFormSubmitHandler;
