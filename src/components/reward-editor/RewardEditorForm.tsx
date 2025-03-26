
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardBackgroundSection from './RewardBackgroundSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';

// Define the form schema for validation
const rewardFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cost: z.number().min(0, "Cost must be 0 or greater"),
  background_image_url: z.string().nullable().optional(),
  background_opacity: z.number().min(0).max(1).optional(),
  focal_point_x: z.number().optional(),
  focal_point_y: z.number().optional(),
  icon_url: z.string().nullable().optional(),
  title_color: z.string().optional(),
  subtext_color: z.string().optional(),
  calendar_color: z.string().optional(),
  highlight_effect: z.boolean().optional(),
  icon_color: z.string().optional(),
});

// Define the type for the form values
export type RewardFormValues = z.infer<typeof rewardFormSchema>;

interface RewardEditorFormProps {
  rewardData?: any;
  onSave: (data: RewardFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: number) => void;
}

const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  rewardData, 
  onSave, 
  onCancel, 
  onDelete 
}) => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Initialize form with default values or existing reward data
  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      title: rewardData?.title || '',
      description: rewardData?.description || '',
      cost: rewardData?.cost || 0,
      background_image_url: rewardData?.background_image_url || null,
      background_opacity: rewardData?.background_opacity || 1,
      focal_point_x: rewardData?.focal_point_x || 0.5,
      focal_point_y: rewardData?.focal_point_y || 0.5,
      icon_url: rewardData?.icon_url || null,
      title_color: rewardData?.title_color || '#FFFFFF',
      subtext_color: rewardData?.subtext_color || '#CCCCCC',
      calendar_color: rewardData?.calendar_color || '#3B82F6',
      highlight_effect: rewardData?.highlight_effect || false,
      icon_color: rewardData?.icon_color || '#FFFFFF',
    }
  });

  // Load existing data when component mounts or rewardData changes
  useEffect(() => {
    if (rewardData) {
      // Set image preview if exists
      if (rewardData.background_image_url) {
        setImagePreview(rewardData.background_image_url);
      }
      
      // Set icon preview if exists
      if (rewardData.icon_url) {
        setIconPreview(rewardData.icon_url);
      }
      
      // Set selected icon name if exists
      if (rewardData.icon_name) {
        setSelectedIconName(rewardData.icon_name);
      }
    }
  }, [rewardData]);

  const handleSubmit = async (values: RewardFormValues) => {
    console.log("Form submitted with values:", values);
    setLoading(true);
    
    try {
      // Prepare the reward data object with all form values
      const rewardToSave = {
        ...values,
        iconName: selectedIconName || undefined,
      };
      
      // Explicitly ensure background_image_url is properly handled
      if (!imagePreview) {
        rewardToSave.background_image_url = null;
      }
      
      console.log("Calling onSave with data:", rewardToSave);
      await onSave(rewardToSave);
      
      toast({
        title: "Success",
        description: "Reward saved successfully",
      });
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementCost = () => {
    const currentCost = form.getValues('cost');
    form.setValue('cost', currentCost + 1);
  };

  const decrementCost = () => {
    const currentCost = form.getValues('cost');
    form.setValue('cost', Math.max(0, currentCost - 1));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        form.setValue('background_image_url', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    form.setValue('background_image_url', null);
  };

  const handleSelectIcon = (iconName: string) => {
    setSelectedIconName(iconName);
    setIconPreview(null);
  };

  const handleUploadIcon = () => {
    // This would be implemented if custom icon uploads are supported
    console.log("Upload custom icon");
  };

  const handleRemoveIcon = () => {
    setSelectedIconName(null);
    setIconPreview(null);
    form.setValue('icon_url', null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <RewardBasicDetails 
          control={form.control} 
          incrementCost={incrementCost} 
          decrementCost={decrementCost} 
        />

        <RewardIconSection 
          control={form.control}
          selectedIconName={selectedIconName}
          iconPreview={iconPreview}
          iconColor={form.watch('icon_color')}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />

        <RewardBackgroundSection 
          control={form.control}
          imagePreview={imagePreview}
          initialPosition={{
            x: form.getValues('focal_point_x') || 0.5,
            y: form.getValues('focal_point_y') || 0.5
          }}
          onRemoveImage={handleRemoveImage}
          onImageUpload={handleImageUpload}
          setValue={form.setValue}
        />

        <RewardColorSettings control={form.control} />

        <RewardFormActions 
          rewardData={rewardData}
          loading={loading}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </form>
    </Form>
  );
};

export { RewardEditorForm };
