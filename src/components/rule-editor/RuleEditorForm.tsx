import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Image, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/lib/ruleUtils';
import { useRuleCarousel } from '@/contexts/RuleCarouselContext';
import NumberField from './NumberField';
import ColorPickerField from './ColorPickerField';
import PrioritySelector from './PrioritySelector';
import FrequencySelector from './FrequencySelector';
import BackgroundImageSelector from './BackgroundImageSelector';
import IconSelector from './IconSelector';
import PredefinedIconsGrid from './PredefinedIconsGrid';
import DeleteRuleDialog from './DeleteRuleDialog';

interface RuleFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
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
  background_images?: string[];
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
  const { carouselTimer, setCarouselTimer } = useRuleCarousel();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [backgroundImages, setBackgroundImages] = useState<string[]>(
    ruleData?.background_images || []
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
  const form = useForm<RuleFormValues>({
    defaultValues: {
      title: ruleData?.title || '',
      description: ruleData?.description || '',
      points: ruleData?.points || 5,
      frequency: (ruleData?.frequency as 'daily' | 'weekly') || 'daily',
      frequency_count: ruleData?.frequency_count || 1,
      background_image_url: ruleData?.background_image_url,
      background_opacity: ruleData?.background_opacity || 100,
      title_color: ruleData?.title_color || '#FFFFFF',
      subtext_color: ruleData?.subtext_color || '#8E9196',
      calendar_color: ruleData?.calendar_color || '#7E69AB',
      icon_color: ruleData?.icon_color || '#9b87f5',
      highlight_effect: ruleData?.highlight_effect || false,
      focal_point_x: ruleData?.focal_point_x || 50,
      focal_point_y: ruleData?.focal_point_y || 50,
      priority: ruleData?.priority || 'medium',
      icon_name: ruleData?.icon_name,
      background_images: ruleData?.background_images || [],
      carousel_timer: carouselTimer,
    },
  });

  React.useEffect(() => {
    setIconPreview(ruleData?.icon_url || null);
    setSelectedIconName(ruleData?.icon_name || null);
    
    if (ruleData?.background_images && ruleData.background_images.length > 0) {
      setBackgroundImages(ruleData.background_images);
    } else if (ruleData?.background_image_url) {
      setBackgroundImages([ruleData.background_image_url]);
    } else {
      setBackgroundImages([]);
    }
    
    setSelectedImageIndex(0);
    
    const previewImage = ruleData?.background_images?.[0] || ruleData?.background_image_url || null;
    setImagePreview(previewImage);
  }, [ruleData]);

  React.useEffect(() => {
    if (!ruleData) {
      setSelectedImageIndex(0);
      setBackgroundImages([]);
    }
  }, [taData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        const newImages = [...backgroundImages];
        if (selectedImageIndex < newImages.length) {
          newImages[selectedImageIndex] = base64String;
        } else {
          newImages.push(base64String);
        }
        
        setBackgroundImages(newImages);
        form.setValue('background_images', newImages);
        
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectThumbnail = (index: number) => {
    setSelectedImageIndex(index);
    
    if (index < backgroundImages.length) {
      setImagePreview(backgroundImages[index]);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveCurrentImage = () => {
    const newImages = [...backgroundImages];
    
    if (selectedImageIndex < newImages.length) {
      newImages.splice(selectedImageIndex, 1);
      setBackgroundImages(newImages);
      form.setValue('background_images', newImages);
      
      if (newImages.length > 0) {
        const newIndex = Math.min(selectedImageIndex, newImages.length - 1);
        setSelectedImageIndex(newIndex);
        setImagePreview(newImages[newIndex]);
      } else {
        setSelectedImageIndex(0);
        setImagePreview(null);
        form.setValue('background_image_url', undefined);
      }
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
      const ruleToSave: Partial<Rule> = {
        ...values,
        id: ruleData?.id,
        icon_name: selectedIconName || undefined,
        background_images: backgroundImages,
        carousel_timer: carouselTimer,
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

  const incrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', currentPoints + 1);
  };

  const decrementPoints = () => {
    const currentPoints = form.getValues('points');
    form.setValue('points', Math.max(0, currentPoints - 1));
  };

  const incrementFrequencyCount = () => {
    const currentCount = form.getValues('frequency_count');
    form.setValue('frequency_count', currentCount + 1);
  };

  const decrementFrequencyCount = () => {
    const currentCount = form.getValues('frequency_count');
    if (currentCount > 1) {
      form.setValue('frequency_count', currentCount - 1);
    }
  };

  const handleCarouselTimerChange = (newValue: number) => {
    setCarouselTimer(newValue);
    form.setValue('carousel_timer', newValue);
  };

  const handleDelete = () => {
    if (ruleData?.id && onDelete) {
      onDelete(ruleData.id);
      setIsDeleteDialogOpen(false);
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
          
          <NumberField
            control={form.control}
            name="points"
            label="Points"
            onIncrement={incrementPoints}
            onDecrement={decrementPoints}
            minValue={0}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FrequencySelector control={form.control} />
          
          <NumberField
            control={form.control}
            name="frequency_count"
            label="Times per period"
            onIncrement={incrementFrequencyCount}
            onDecrement={decrementFrequencyCount}
            minValue={1}
          />
        </div>
        
        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Background Images</FormLabel>
          
          <div className="flex justify-between items-end mb-4">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((index) => {
                const imageUrl = backgroundImages[index] || '';
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectThumbnail(index)}
                    className={`w-12 h-12 rounded-md cursor-pointer transition-all
                      ${selectedImageIndex === index
                        ? 'border-[2px] border-[#FEF7CD] shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]'
                        : 'bg-dark-navy border border-light-navy hover:border-white'}
                    `}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        className="w-full h-full object-cover rounded-md"
                        alt="Background thumbnail"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgNEg4LjhDNy4xMTk4NCA0IDUuNzM5NjggNC44Mi40LjJWMjBIMTZWMTVIMjAuNkMyMS45MjU1IDE1IDIzIDE2LjA3NDUgMjMgMTcuNFYyMEg0VjE3LjRDNyAxNi4wNzQ1IDguMDc0NTIgMTUgOS40IDE1SDEzVjRaIiBzdHJva2U9IiM0QjU1NjMiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xOSA4QzE5IDkuMTA0NTcgMTguMTA0NiAxMCAxNyAxMEMxNS44OTU0IDEwIDE1IDkuMTA0NTcgMTUgOEMxNSA2Ljg5NTQzIDE1Ljg5NTQgNiAxNyA2QzE4LjEwNDYgNiAxOSA2Ljg5NTQzIDE5IDhaIiBmaWxsPSIjNEI1NTYzIi8+PC9zdmc+';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-light-navy">
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex flex-col items-start ml-4">
              <label className="text-sm text-white mb-1">
                Carousel Timer
                <span className="block text-xs text-muted-foreground">
                  (Time between image transitions)
                </span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const newTime = Math.max(3, carouselTimer - 1);
                    handleCarouselTimerChange(newTime);
                  }}
                  className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy w-8 h-8 flex items-center justify-center rounded-md"
                >
                  –
                </button>

                <div className="w-12 text-center text-white">
                  {carouselTimer}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newTime = Math.min(20, carouselTimer + 1);
                    handleCarouselTimerChange(newTime);
                  }}
                  className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy w-8 h-8 flex items-center justify-center rounded-md"
                >
                  +
                </button>

                <span className="text-white text-sm ml-1">(s)</span>
              </div>
            </div>
          </div>
          
          <BackgroundImageSelector
            control={form.control}
            imagePreview={imagePreview}
            initialPosition={{ 
              x: ruleData?.focal_point_x || 50, 
              y: ruleData?.focal_point_y || 50 
            }}
            onRemoveImage={handleRemoveCurrentImage}
            onImageUpload={handleImageUpload}
            setValue={form.setValue}
          />
        </div>
        
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
