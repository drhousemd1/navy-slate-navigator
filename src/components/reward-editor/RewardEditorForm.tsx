
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from "@/components/ui/form"; // Import the Form component
import RewardBasicDetails from './RewardBasicDetails';
import RewardIconSection from './RewardIconSection';
import RewardBackgroundSection from './RewardBackgroundSection';
import RewardColorSettings from './RewardColorSettings';
import RewardFormActions from './RewardFormActions';
import DeleteRewardDialog from './DeleteRewardDialog';

interface RewardEditorFormProps {
  rewardData?: any;
  onSave: (formData: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: number) => void;
  isSaving?: boolean;
}

export const RewardEditorForm: React.FC<RewardEditorFormProps> = ({ 
  rewardData, 
  onSave, 
  onCancel,
  onDelete,
  isSaving = false
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [iconPreview, setIconPreview] = React.useState<string | null>(null);

  // Form handling with react-hook-form
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      cost: 10,
      icon_name: null as string | null,
      icon_color: '#9b87f5',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      background_image_url: null as string | null,
      background_opacity: 100,
      focal_point_x: 50,
      focal_point_y: 50,
    }
  });

  const { control, handleSubmit, setValue, watch, reset } = form;

  // Watch form values
  const iconName = watch('icon_name');
  const iconColor = watch('icon_color');
  const imagePreview = watch('background_image_url');

  // Load existing reward data if available
  useEffect(() => {
    if (rewardData) {
      reset({
        title: rewardData.title || '',
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        icon_name: rewardData.icon_name || null,
        icon_color: rewardData.icon_color || '#9b87f5',
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        highlight_effect: rewardData.highlight_effect || false,
        background_image_url: rewardData.background_image_url || null,
        background_opacity: rewardData.background_opacity || 100,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
      });
    }
  }, [rewardData, reset]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setValue('background_image_url', result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setValue('background_image_url', null);
  };

  const handleSelectIcon = (iconName: string) => {
    setValue('icon_name', iconName);
  };

  const handleUploadIcon = () => {
    // Placeholder for custom icon upload functionality
    console.log('Custom icon upload not implemented');
  };

  const handleRemoveIcon = () => {
    setValue('icon_name', null);
  };

  const incrementCost = () => {
    setValue('cost', (watch('cost') || 0) + 1);
  };

  const decrementCost = () => {
    const currentCost = watch('cost') || 0;
    if (currentCost > 0) {
      setValue('cost', currentCost - 1);
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete && rewardData?.index !== undefined) {
      onDelete(rewardData.index);
    }
    setIsDeleteDialogOpen(false);
  };

  const onSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <RewardBasicDetails 
          control={control}
          incrementCost={incrementCost}
          decrementCost={decrementCost}
        />
        
        <RewardIconSection 
          control={control}
          selectedIconName={iconName}
          iconPreview={iconPreview}
          iconColor={iconColor}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />
        
        <RewardBackgroundSection 
          control={control}
          imagePreview={imagePreview}
          initialPosition={{ x: watch('focal_point_x'), y: watch('focal_point_y') }}
          onRemoveImage={handleRemoveImage}
          onImageUpload={(e) => {
            if (e.target.files?.[0]) {
              handleImageUpload(e.target.files[0]);
            }
          }}
          setValue={setValue}
        />
        
        <RewardColorSettings 
          control={control}
        />
        
        <RewardFormActions 
          rewardData={rewardData}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          onCancel={onCancel}
          onDelete={rewardData && onDelete ? () => setIsDeleteDialogOpen(true) : undefined}
          isSaving={isSaving}
        />
        
        <DeleteRewardDialog 
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          rewardName={rewardData?.title || 'this reward'}
        />
      </form>
    </Form>
  );
};
