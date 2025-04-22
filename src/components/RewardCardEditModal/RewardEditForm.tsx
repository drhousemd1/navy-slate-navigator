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
import { ColorPickerField, PrioritySelector, BackgroundImageSelector, IconSelector, PredefinedIconsGrid } from './FormFields';

const rewardFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cost: z.number().min(0, "Cost must be 0 or greater"),
  background_image_url: z.string().nullable().optional(),
  background_opacity: z.number().min(0).max(100).optional(),
  focal_point_x: z.number().optional(),
  focal_point_y: z.number().optional(),
  title_color: z.string().optional(),
  subtext_color: z.string().optional(),
  calendar_color: z.string().optional(),
  highlight_effect: z.boolean().optional(),
  icon_color: z.string().optional(),
});

export type RewardFormValues = z.infer<typeof rewardFormSchema>;

interface RewardEditorFormProps {
  rewardData?: any;
  onSave: (data: RewardFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: number) => void;
}

const RewardEditForm: React.FC<RewardEditorFormProps> = ({ 
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

  console.log("RewardEditorForm rendering with rewardData:", rewardData);
  console.log("Initial background_opacity:", rewardData?.background_opacity);

  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      title: rewardData?.title || '',
      description: rewardData?.description || '',
      cost: rewardData?.cost || 0,
      background_image_url: rewardData?.background_image_url || null,
      background_opacity: rewardData?.background_opacity || 100,
      focal_point_x: rewardData?.focal_point_x || 50,
      focal_point_y: rewardData?.focal_point_y || 50,
      title_color: rewardData?.title_color || '#FFFFFF',
      subtext_color: rewardData?.subtext_color || '#CCCCCC',
      calendar_color: rewardData?.calendar_color || '#3B82F6',
      highlight_effect: rewardData?.highlight_effect || false,
      icon_color: rewardData?.icon_color || '#FFFFFF',
    }
  });

  console.log("Form background_opacity value:", form.getValues('background_opacity'));

  useEffect(() => {
    if (rewardData) {
      console.log("Setting form data from rewardData:", rewardData);
      
      const opacityValue = rewardData.background_opacity || 100;
        
      console.log("Setting background_opacity to:", opacityValue);
      
      form.reset({
        title: rewardData.title || '',
        description: rewardData.description || '',
        cost: rewardData.cost || 0,
        background_image_url: rewardData.background_image_url || null,
        background_opacity: opacityValue,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#CCCCCC',
        calendar_color: rewardData.calendar_color || '#3B82F6',
        highlight_effect: rewardData.highlight_effect || false,
        icon_color: rewardData.icon_color || '#FFFFFF',
      });
      
      if (rewardData.background_image_url) {
        setImagePreview(rewardData.background_image_url);
      }
      
      if (rewardData.icon_name) {
        setSelectedIconName(rewardData.icon_name);
      }
    }
  }, [rewardData, form]);

  const handleSubmit = async (values: RewardFormValues) => {
    console.log("Form submitted with values:", values);
    setLoading(true);
    
    try {
      const processedValues = {
        ...values,
        icon_name: selectedIconName || undefined,
      };
      
      if (!imagePreview) {
        processedValues.background_image_url = null;
      }
      
      console.log("Calling onSave with processed data:", processedValues);
      await onSave(processedValues);
      
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
        form.setValue('background_opacity', 100);
        console.log("Image uploaded, setting opacity to 100%");
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
    console.log("Upload custom icon");
  };

  const handleRemoveIcon = () => {
    setSelectedIconName(null);
    setIconPreview(null);
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
            x: form.getValues('focal_point_x') || 50,
            y: form.getValues('focal_point_y') || 50
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

export { RewardEditForm };