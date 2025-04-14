import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ColorPickerField from './ColorPickerField';
import PrioritySelector from './PrioritySelector';
import IconSelector from './IconSelector';
import PredefinedIconsGrid from './PredefinedIconsGrid';
import DeleteRuleDialog from './DeleteRuleDialog';
import { useRuleCarousel } from '@/contexts/RuleCarouselContext';
import ImageSelectionSection from './ImageSelectionSection';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data?: number[];
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
}

interface RuleFormValues {
  title: string;
  description: string;
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
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
}

interface RuleEditorFormProps {
  ruleData?: Partial<Rule>;
  onSave: (ruleData: any) => void;
  onDelete?: (ruleId: string) => void;
  onCancel: () => void;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({ 
  ruleData,
  onSave,
  onDelete,
  onCancel
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const { carouselTimer, setCarouselTimer } = useRuleCarousel();
  
  const form = useForm<RuleFormValues>({
    defaultValues: {
      title: ruleData?.title || '',
      description: ruleData?.description || '',
      background_image_url: ruleData?.background_image_url || '',
      background_opacity: ruleData?.background_opacity || 100,
      title_color: ruleData?.title_color || '#FFFFFF',
      subtext_color: ruleData?.subtext_color || '#FFFFFF',
      calendar_color: ruleData?.calendar_color || '#9c7abb',
      icon_color: ruleData?.icon_color || '#FFFFFF',
      highlight_effect: ruleData?.highlight_effect || false,
      focal_point_x: ruleData?.focal_point_x || 50,
      focal_point_y: ruleData?.focal_point_y || 50,
      priority: ruleData?.priority || 'medium',
      icon_name: ruleData?.icon_name || '',
      frequency: ruleData?.frequency || 'daily',
      frequency_count: ruleData?.frequency_count || 3,
      background_images: ruleData?.background_images || [null, null, null, null, null],
      carousel_timer: ruleData?.carousel_timer || carouselTimer,
    },
  });

  useEffect(() => {
    setIconPreview(ruleData?.icon_url || null);
    setSelectedIconName(ruleData?.icon_name || null);
    setPosition({ x: ruleData?.focal_point_x || 50, y: ruleData?.focal_point_y || 50 });

    const newImageSlots = [null, null, null, null, null];

    if (ruleData?.background_images && ruleData.background_images.length > 0) {
      ruleData.background_images.forEach((img, index) => {
        if (index < newImageSlots.length && img) {
          newImageSlots[index] = img;
        }
      });
    } else if (ruleData?.background_image_url) {
      newImageSlots[0] = ruleData.background_image_url;
    }

    setImageSlots(newImageSlots);

    if (selectedBoxIndex === null) {
      const firstImageIndex = newImageSlots.findIndex(img => img !== null);
      setSelectedBoxIndex(firstImageIndex !== -1 ? firstImageIndex : null);
    }

    setImagePreview(
      selectedBoxIndex !== null ? newImageSlots[selectedBoxIndex] : null
    );
  }, [ruleData]);

  const handleCarouselTimerChange = (newValue: number) => {
    setCarouselTimer(newValue);
    form.setValue('carousel_timer', newValue);
  };

  const handleMultiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // If no box selected, auto-select the first empty slot
    let targetIndex = selectedBoxIndex;
    if (targetIndex === null) {
      const firstEmpty = imageSlots.findIndex((slot) => !slot);
      if (firstEmpty === -1) {
        targetIndex = 0;
      } else {
        targetIndex = firstEmpty;
      }
      setSelectedBoxIndex(targetIndex);
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      const updatedSlots = [...imageSlots];
      updatedSlots[targetIndex!] = base64String;
      setImageSlots(updatedSlots);
      setImagePreview(base64String);
      
      // Update both form values
      form.setValue('background_image_url', base64String);
      form.setValue('background_images', updatedSlots.filter(Boolean)); // Filter out null values
      form.setValue('background_opacity', 100);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImageSlot = (index: number) => {
    setSelectedBoxIndex(index);
    const imageUrl = imageSlots[index];
    setImagePreview(imageUrl);
    
    // Important: Update background_image_url when changing selected slot
    form.setValue('background_image_url', imageUrl || '');
  };

  const handleRemoveCurrentImage = () => {
    if (selectedBoxIndex !== null) {
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
      setImagePreview(null);
      
      // Update both form values
      form.setValue('background_image_url', '');
      form.setValue('background_images', updatedSlots.filter(Boolean));
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
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleIconSelect = (iconName: string) => {
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setIconPreview(iconUrl);
      setSelectedIconName(null);
      form.setValue('icon_url', iconUrl);
      form.setValue('icon_name', undefined);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the rule",
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

  const handleSubmit = async (values: RuleFormValues) => {
    setLoading(true);
    
    try {
      // Filter valid image slots - ensure we only pass non-null values
      const validImageSlots = imageSlots
        .filter(slot => typeof slot === 'string' && slot.trim() !== '')
        .map(slot => {
          if (!slot) return null;
          try {
            if (slot.startsWith('data:image') || slot.startsWith('http')) {
              return slot;
            } else {
              return null;
            }
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean) as string[];
      
      const ruleToSave: Partial<Rule> = {
        ...values,
        id: ruleData?.id,
        icon_name: selectedIconName || undefined,
        highlight_effect: values.highlight_effect || false,
        focal_point_x: position.x,
        focal_point_y: position.y,
        background_images: validImageSlots.length > 0 ? validImageSlots : [],
        carousel_timer: carouselTimer
      };
      
      await onSave(ruleToSave);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: "Failed to save rule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (ruleData?.id && onDelete) {
      onDelete(ruleData.id);
      setIsDeleteDialogOpen(false);
    }
  };

  // Set form values when position changes
  useEffect(() => {
    form.setValue('focal_point_x', position.x);
    form.setValue('focal_point_y', position.y);
  }, [position, form]);

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
                  placeholder="Rule title" 
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
                  placeholder="Rule description" 
                  className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrioritySelector control={form.control} />
        </div>

        <ImageSelectionSection
          imagePreview={imagePreview}
          imageSlots={imageSlots}
          selectedBoxIndex={selectedBoxIndex}
          carouselTimer={carouselTimer}
          onCarouselTimerChange={handleCarouselTimerChange}
          onSelectImageSlot={handleSelectImageSlot}
          onRemoveImage={handleRemoveCurrentImage}
          onImageUpload={handleMultiImageUpload}
          setValue={form.setValue}
          position={position}
          control={form.control}
        />
        
        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Rule Icon</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
              <IconSelector
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
            </div>
            
            <PredefinedIconsGrid
              selectedIconName={selectedIconName}
              iconColor={form.watch('icon_color')}
              onSelectIcon={handleIconSelect}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorPickerField 
            control={form.control} 
            name="title_color" 
            label="Title Color" 
          />
          
          <ColorPickerField 
            control={form.control} 
            name="subtext_color" 
            label="Subtext Color" 
          />
          
          <ColorPickerField 
            control={form.control} 
            name="calendar_color" 
            label="Calendar Color" 
          />
          
          <ColorPickerField 
            control={form.control} 
            name="icon_color" 
            label="Icon Color" 
          />
        </div>
        
        <FormField
          control={form.control}
          name="highlight_effect"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-white">Highlight Effect</FormLabel>
                <p className="text-sm text-white">Apply a yellow highlight behind title and description</p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="pt-4 w-full flex items-center justify-end gap-3">
          {ruleData?.id && onDelete && (
            <DeleteRuleDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={handleDelete}
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

export default RuleEditorForm;
