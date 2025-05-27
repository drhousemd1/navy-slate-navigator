import React, { useState } from 'react';
import { Form, UseFormReturn } from '@/components/ui/form';
import { PunishmentData } from '@/contexts/PunishmentsContext';
import { toast } from '@/hooks/use-toast';
import { PunishmentFormValues, punishmentFormSchema } from './PunishmentFormProvider';
import { logger } from '@/lib/logger'; // Added logger

interface PunishmentFormSubmitHandlerProps {
  children: React.ReactNode;
  punishmentData?: PunishmentData; // For context, e.g., if updating
  form: UseFormReturn<PunishmentFormValues>;
  selectedIconName: string | null;
  imagePreview: string | null; // For background image
  iconPreview: string | null;  // For icon image
  onSave: (data: Partial<PunishmentData>) => Promise<PunishmentData | null>; // Updated return type
  onCancel: () => void; // Added for completeness, though not directly used by this component's submit logic
}

const PunishmentFormSubmitHandler: React.FC<PunishmentFormSubmitHandlerProps> = ({
  children,
  punishmentData,
  form,
  selectedIconName,
  imagePreview,
  iconPreview,
  onSave,
  // onCancel is not used here, but kept for prop consistency if this component evolves
}) => {
  const { handleSubmit, reset } = form;

  const processAndSubmit = async (values: PunishmentFormValues) => {
    logger.log("Form values before processing:", values);

    const dataToSave: Partial<PunishmentData> = {
      ...values,
      points: Number(values.points) || 0,
      background_image_url: imagePreview, // Use the state from usePunishmentBackground hook
      icon_name: selectedIconName,
      icon_url: iconPreview, // Use the state from usePunishmentIcon hook
      // Ensure numeric fields are numbers
      background_opacity: Number(values.background_opacity) || 100,
      focal_point_x: Number(values.focal_point_x) || 50,
      focal_point_y: Number(values.focal_point_y) || 50,
    };
    logger.log("Data to save after processing:", dataToSave);

    try {
      const savedData = await onSave(dataToSave);
      if (savedData) {
        toast({
          title: punishmentData?.id ? "Punishment Updated" : "Punishment Created",
          description: `${savedData.title} has been successfully saved.`,
        });
        // Reset form with potentially new data (e.g., new ID from creation)
        // or updated data. This depends on how onSave updates the parent state.
        // For simplicity, we can reset to the saved data.
        // However, `reset` expects PunishmentFormValues. Need to map `savedData` back or rely on parent to re-key.
        // A common pattern is for the parent component managing the dialog (PunishmentEditor)
        // to close the dialog and refresh data, which implicitly "resets" the context for next open.
        // If the form needs to stay open and reflect new state, `reset` would be used:
        // reset(mapPunishmentDataToFormValues(savedData)); // Assuming mapPunishmentDataToFormValues exists
      } else {
        // Handle case where save operation completed but returned null (e.g., internal error in onSave)
        // Toast for this case is likely handled within onSave or by optimistic mutation hooks
      }
    } catch (error) {
      logger.error("Error saving punishment:", error); // This is now primarily for client-side pre-save errors
      // Server-side errors and their toasts are typically handled by the mutation hooks used in onSave.
      // If onSave itself throws before calling mutation, this catch block is relevant.
      // toast({
      //   title: "Save Error",
      //   description: "An unexpected error occurred while trying to save. Please check console for details.",
      //   variant: "destructive",
      // });
    }
  };

  return (
    <form onSubmit={handleSubmit(processAndSubmit)} className="space-y-8">
      {children}
      {/* Actions (Save, Cancel, Delete buttons) are typically rendered by PunishmentFormActions within children */}
    </form>
  );
};

export default PunishmentFormSubmitHandler;
