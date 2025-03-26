import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '../PunishmentEditor';
import PunishmentBasicDetails from './form/PunishmentBasicDetails';
import PunishmentIconSection from './form/PunishmentIconSection';
import PunishmentBackgroundSection from './form/PunishmentBackgroundSection';
import PunishmentColorSettings from './PunishmentColorSettings';
import PunishmentFormActions from './form/PunishmentFormActions';

const punishmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  points: z.number().min(0, "Points must be 0 or greater"),
  icon_color: z.string().optional(),
  title_color: z.string().default('#FFFFFF'),
  subtext_color: z.string().default('#8E9196'),
  calendar_color: z.string().default('#ea384c'),
  highlight_effect: z.boolean().default(false),
  background_opacity: z.number().min(0).max(100).default(50),
  focal_point_x: z.number().min(0).max(100).default(50),
  focal_point_y: z.number().min(0).max(100).default(50),
});

export type PunishmentFormValues = z.infer<typeof punishmentFormSchema>;

interface PunishmentEditorFormProps {
  punishmentData?: PunishmentData;
  onSave: (data: PunishmentData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: string) => void;
}

const PunishmentEditorForm: React.FC<PunishmentEditorFormProps> = ({
  punishmentData,
  onSave,
  onCancel,
  onDelete
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { createPunishment, updatePunishment } = usePunishments();

  const form = useForm<PunishmentFormValues>({
    resolver: zodResolver(punishmentFormSchema),
    defaultValues: {
      title: punishmentData?.title || '',
      description: punishmentData?.description || '',
      points: punishmentData?.points || 5,
      icon_color: punishmentData?.icon_color || '#ea384c',
      title_color: punishmentData?.title_color || '#FFFFFF',
      subtext_color: punishmentData?.subtext_color || '#8E9196',
      calendar_color: punishmentData?.calendar_color || '#ea384c',
      highlight_effect: punishmentData?.highlight_effect || false,
      background_opacity: punishmentData?.background_opacity || 50,
      focal_point_x: punishmentData?.focal_point_x || 50,
      focal_point_y: punishmentData?.focal_point_y || 50,
    }
  });

  useEffect(() => {
    if (punishmentData) {
      console.log("Setting form data from punishmentData:", punishmentData);
      
      form.reset({
        title: punishmentData.title || '',
        description: punishmentData.description || '',
        points: punishmentData.points || 5,
        icon_color: punishmentData.icon_color || '#ea384c',
        title_color: punishmentData.title_color || '#FFFFFF',
        subtext_color: punishmentData.subtext_color || '#8E9196',
        calendar_color: punishmentData.calendar_color || '#ea384c',
        highlight_effect: punishmentData.highlight_effect || false,
        background_opacity: punishmentData.background_opacity || 50,
        focal_point_x: punishmentData.focal_point_x || 50,
        focal_point_y: punishmentData.focal_point_y || 50,
      });
      
      if (punishmentData.icon_name) {
        setSelectedIconName(punishmentData.icon_name);
      }
      
      if (punishmentData.background_image_url) {
        setImagePreview(punishmentData.background_image_url);
      }
    }
  }, [punishmentData, form]);

  const handleSubmit = async (values: PunishmentFormValues) => {
    setLoading(true);
    
    try {
      console.log("Submitting form with values:", values);
      console.log("Background image:", imagePreview);
      
      const processedValues: PunishmentData = {
        title: values.title,
        points: values.points,
        description: values.description,
        icon_name: selectedIconName || undefined,
        icon_color: values.icon_color,
        title_color: values.title_color,
        subtext_color: values.subtext_color,
        calendar_color: values.calendar_color,
        highlight_effect: values.highlight_effect,
        background_image_url: imagePreview || undefined,
        background_opacity: values.background_opacity,
        focal_point_x: values.focal_point_x,
        focal_point_y: values.focal_point_y,
      };
      
      console.log("Processed values to save:", processedValues);
      
      if (punishmentData?.id) {
        await updatePunishment(punishmentData.id, processedValues);
      } else {
        await createPunishment(processedValues);
      }
      
      await onSave(processedValues);
      
      toast({
        title: punishmentData?.id ? "Punishment Updated" : "Punishment Created",
        description: `Your punishment has been ${punishmentData?.id ? "updated" : "created"} successfully.`,
      });
      
      onCancel();
      
    } catch (error) {
      console.error('Error saving punishment:', error);
      toast({
        title: "Error",
        description: "Failed to save punishment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIcon = (iconName: string) => {
    setSelectedIconName(iconName);
    setIconPreview(null);
  };

  const handleUploadIcon = () => {
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
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleRemoveIcon = () => {
    setSelectedIconName(null);
    setIconPreview(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleImageUpload called");
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log("Image loaded as base64");
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <PunishmentBasicDetails 
          control={form.control} 
          setValue={form.setValue}
        />
        
        <PunishmentBackgroundSection
          control={form.control}
          imagePreview={imagePreview}
          onRemoveImage={() => {
            console.log("Removing image");
            setImagePreview(null);
          }}
          onImageUpload={handleImageUpload}
          setValue={form.setValue}
        />
        
        <PunishmentIconSection
          selectedIconName={selectedIconName}
          iconPreview={iconPreview}
          iconColor={form.watch('icon_color')}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />
        
        <PunishmentColorSettings control={form.control} />
        
        <PunishmentFormActions 
          punishmentData={punishmentData}
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

export default PunishmentEditorForm;
