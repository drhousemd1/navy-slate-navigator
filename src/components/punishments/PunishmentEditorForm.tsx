
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import NumberField from '../task-editor/NumberField';
import IconSelector from '../task-editor/IconSelector';
import PredefinedIconsGrid from '../task-editor/PredefinedIconsGrid';
import DeletePunishmentDialog from './DeletePunishmentDialog';
import BackgroundImageSelector from '../task-editor/BackgroundImageSelector';
import PunishmentColorSettings from './PunishmentColorSettings';
import { usePunishments } from '@/contexts/PunishmentsContext';

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
  punishmentData?: any;
  onSave: (data: PunishmentFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: any) => void;
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
      const processedValues = {
        ...values,
        icon_name: selectedIconName || undefined,
        background_image_url: imagePreview,
      };
      
      if (punishmentData?.id) {
        // Update existing punishment
        await updatePunishment(punishmentData.id, processedValues);
      } else {
        // Create new punishment
        await createPunishment(processedValues);
      }
      
      await onSave(processedValues);
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

  const incrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', currentPoints + 1);
  };

  const decrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', Math.max(0, currentPoints - 1));
  };

  const handleSelectIcon = (iconName: string) => {
    setSelectedIconName(iconName);
    setIconPreview(null);
  };

  const handleUploadIcon = () => {
    // Implementation for uploading custom icons
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
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Punishment title" 
                  className="bg-dark-navy border-light-navy text-white" 
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Punishment description" 
                  className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <NumberField
          control={form.control}
          name="points"
          label="Points"
          onIncrement={incrementPoints}
          onDecrement={decrementPoints}
          minValue={0}
        />

        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Background Image</FormLabel>
          <BackgroundImageSelector
            control={form.control}
            imagePreview={imagePreview}
            initialPosition={{
              x: form.getValues('focal_point_x'),
              y: form.getValues('focal_point_y')
            }}
            onRemoveImage={() => {
              setImagePreview(null);
            }}
            onImageUpload={handleImageUpload}
            setValue={form.setValue}
          />
        </div>

        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Punishment Icon</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
              <IconSelector
                selectedIconName={selectedIconName}
                iconPreview={iconPreview}
                iconColor={form.watch('icon_color')}
                onSelectIcon={handleSelectIcon}
                onUploadIcon={handleUploadIcon}
                onRemoveIcon={handleRemoveIcon}
              />
            </div>
            
            <PredefinedIconsGrid
              selectedIconName={selectedIconName}
              iconColor={form.watch('icon_color')}
              onSelectIcon={handleSelectIcon}
            />
          </div>
        </div>

        <PunishmentColorSettings control={form.control} />
        
        <div className="pt-4 w-full flex items-center justify-end gap-3">
          {punishmentData?.id && onDelete && (
            <DeletePunishmentDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={() => onDelete(punishmentData.id)}
            />
          )}
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onCancel}
            className="bg-red-700 border-light-navy text-white hover:bg-red-600"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2"
            disabled={loading}
          >
            {loading ? 'Saving...' : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PunishmentEditorForm;
