
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from "@/components/ui/form";
import { toast } from '@/hooks/use-toast';
import RewardBasicDetails from './RewardBasicDetails';
import RewardBackgroundSection from './RewardBackgroundSection';
import RewardIconSection from './RewardIconSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';

interface RewardFormValues {
  title: string;
  description: string;
  cost: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
}

interface RewardEditorFormProps {
  rewardData?: any;
  onSave: (rewardData: any) => void;
  onCancel: () => void;
  onDelete?: (id: number) => void;
}

const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  rewardData,
  onSave,
  onCancel,
  onDelete
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  console.log("RewardEditorForm initialized with reward data:", rewardData);
  
  const form = useForm<RewardFormValues>({
    defaultValues: {
      title: rewardData?.title || '',
      description: rewardData?.description || '',
      cost: rewardData?.cost || 10,
      background_image_url: rewardData?.background_image_url,
      background_opacity: rewardData?.background_opacity || 100,
      title_color: rewardData?.title_color || '#FFFFFF',
      subtext_color: rewardData?.subtext_color || '#8E9196',
      calendar_color: rewardData?.calendar_color || '#7E69AB',
      icon_color: rewardData?.icon_color || '#9b87f5',
      highlight_effect: rewardData?.highlight_effect || false,
      focal_point_x: rewardData?.focal_point_x || 50,
      focal_point_y: rewardData?.focal_point_y || 50,
      icon_name: rewardData?.iconName,
    },
  });

  useEffect(() => {
    setImagePreview(rewardData?.background_image_url || null);
    setIconPreview(rewardData?.icon_url || null);
    setSelectedIconName(rewardData?.iconName || null);
    
    console.log("RewardEditorForm useEffect - setting initial values", {
      imagePreview: rewardData?.background_image_url || null,
      iconPreview: rewardData?.icon_url || null,
      selectedIconName: rewardData?.iconName || null
    });
  }, [rewardData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
        console.log("Image uploaded and set to form value");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.files) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setIconPreview(base64String);
            setSelectedIconName(null);
            form.setValue('icon_url', base64String);
            form.setValue('icon_name', undefined);
            console.log("Custom icon uploaded and set to form value");
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleIconSelect = (iconName: string) => {
    console.log("Icon selected:", iconName);
    
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setIconPreview(iconUrl);
      setSelectedIconName(null);
      form.setValue('icon_url', iconUrl);
      form.setValue('icon_name', undefined);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the reward",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      form.setValue('icon_name', iconName);
      form.setValue('icon_url', undefined);
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };

  const handleDelete = () => {
    if (rewardData && onDelete) {
      console.log("Calling onDelete with ID:", rewardData.id || rewardData.index);
      onDelete(rewardData.id || rewardData.index);
      setIsDeleteDialogOpen(false);
    }
  };

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <RewardBasicDetails 
          control={form.control}
          incrementCost={incrementCost}
          decrementCost={decrementCost}
        />
        
        <RewardBackgroundSection
          control={form.control}
          imagePreview={imagePreview}
          initialPosition={{ 
            x: rewardData?.focal_point_x || 50, 
            y: rewardData?.focal_point_y || 50 
          }}
          onRemoveImage={() => {
            setImagePreview(null);
            form.setValue('background_image_url', undefined);
          }}
          onImageUpload={handleImageUpload}
          setValue={form.setValue}
        />
        
        <RewardIconSection
          control={form.control}
          selectedIconName={selectedIconName}
          iconPreview={iconPreview}
          iconColor={form.watch('icon_color')}
          onSelectIcon={handleIconSelect}
          onUploadIcon={handleIconUpload}
          onRemoveIcon={() => {
            setIconPreview(null);
            setSelectedIconName(null);
            form.setValue('icon_url', undefined);
            form.setValue('icon_name', undefined);
          }}
        />
        
        <RewardColorSettings control={form.control} />
        
        <RewardFormActions
          rewardData={rewardData}
          loading={loading}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          onCancel={onCancel}
          onDelete={handleDelete}
        />
      </form>
    </Form>
  );
};

export default RewardEditorForm;
