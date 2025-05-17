
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { PunishmentData } from '@/contexts/PunishmentsContext'; // Assuming this path is correct, or adjust to types
import { toast } from '@/hooks/use-toast';
// import { PunishmentFormValues } from './PunishmentFormProvider'; // If specific form values type is needed

interface PunishmentFormSubmitHandlerProps {
  punishmentData?: PunishmentData;
  form: any; // Consider using UseFormReturn<PunishmentFormValues> for stronger typing
  selectedIconName: string | null;
  imagePreview: string | null;
  iconPreview: string | null;
  onSave: (data: PunishmentData) => Promise<void>;
  onCancel: () => void;
  children: React.ReactNode;
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [hasShownErrorToast, setHasShownErrorToast] = useState(false);

  const onSubmit = async (values: any) => { // Consider typing `values` with PunishmentFormValues
    setHasShownErrorToast(false);
    
    if (isSaving) {
      console.log("Form submission prevented - already saving");
      return;
    }

    console.log("Form submitted with values:", values);
    
    const icon_name = selectedIconName || null;
    const background_image_url = imagePreview || null;
    const icon_url = iconPreview || null;
    
    const points = Number(values.points);
    const dom_points = values.dom_points !== undefined 
      ? Number(values.dom_points)
      : Math.ceil(points / 2);
    
    console.log("Calculated dom_points:", dom_points, "from points:", points);
    
    const dataToSave: Partial<PunishmentData> = { // Use Partial if ID might be missing for creation
      ...values,
      points: points,
      dom_points: dom_points,
      icon_name: icon_name,
      background_image_url: background_image_url,
      icon_url: icon_url,
      icon_color: values.icon_color || '#ea384c'
    };
    
    if (punishmentData?.id) {
      dataToSave.id = punishmentData.id;
    }
    
    console.log("Saving punishment data:", dataToSave);
    
    try {
      setIsSaving(true);
      await onSave(dataToSave as PunishmentData); // Cast to PunishmentData assuming onSave expects full
      
      // Removed form.reset() here.
      // onCancel will handle closing the editor and clearing the persisted draft state
      // for this specific form instance via clearPersistedState.
      onCancel(); 

      toast({
        title: "Success",
        description: "Punishment saved successfully.",
      });
    } catch (error) {
      console.error("Error saving punishment:", error);
      
      if (!hasShownErrorToast) {
        toast({
          title: "Save Failed",
          description: "Failed to save punishment. Please try again.",
          variant: "destructive",
        });
        setHasShownErrorToast(true);
      }
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

export default PunishmentFormSubmitHandler;

