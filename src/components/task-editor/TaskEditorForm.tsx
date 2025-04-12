
import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Image, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Task } from '@/lib/taskUtils';
import NumberField from './NumberField';
import ColorPickerField from './ColorPickerField';
import PrioritySelector from './PrioritySelector';
import FrequencySelector from './FrequencySelector';
import BackgroundImageSelector from './BackgroundImageSelector';
import IconSelector from './IconSelector';
import PredefinedIconsGrid from './PredefinedIconsGrid';
import DeleteTaskDialog from './DeleteTaskDialog';

interface TaskFormValues {
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

interface TaskEditorFormProps {
  taskData?: Partial<Task>;
  onSave: (taskData: any) => void;
  onDelete?: (taskId: string) => void;
  onCancel: () => void;
  updateCarouselTimer?: (newTime: number) => void;
}

const TaskEditorForm: React.FC<TaskEditorFormProps> = ({ 
  taskData,
  onSave,
  onDelete,
  onCancel,
  updateCarouselTimer
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // New state for background images array and carousel
  const [backgroundImages, setBackgroundImages] = useState<string[]>(
    taskData?.background_images || []
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [formCarouselTimer, setFormCarouselTimer] = useState<number>(
    taskData?.carousel_timer || 5
  );
  
  const form = useForm<TaskFormValues>({
    defaultValues: {
      title: taskData?.title || '',
      description: taskData?.description || '',
      points: taskData?.points || 5,
      frequency: (taskData?.frequency as 'daily' | 'weekly') || 'daily',
      frequency_count: taskData?.frequency_count || 1,
      background_image_url: taskData?.background_image_url,
      background_opacity: taskData?.background_opacity || 100,
      title_color: taskData?.title_color || '#FFFFFF',
      subtext_color: taskData?.subtext_color || '#8E9196',
      calendar_color: taskData?.calendar_color || '#7E69AB',
      icon_color: taskData?.icon_color || '#9b87f5',
      highlight_effect: taskData?.highlight_effect || false,
      focal_point_x: taskData?.focal_point_x || 50,
      focal_point_y: taskData?.focal_point_y || 50,
      priority: taskData?.priority || 'medium',
      icon_name: taskData?.icon_name,
      background_images: taskData?.background_images || [],
      carousel_timer: taskData?.carousel_timer || 5,
    },
  });

  React.useEffect(() => {
    setImagePreview(taskData?.background_image_url || null);
    setIconPreview(taskData?.icon_url || null);
    setSelectedIconName(taskData?.icon_name || null);
    
    // Initialize background images from task data
    if (taskData?.background_images && taskData.background_images.length > 0) {
      setBackgroundImages(taskData.background_images);
    } else if (taskData?.background_image_url) {
      // Handle legacy single image
      setBackgroundImages([taskData.background_image_url]);
    } else {
      setBackgroundImages([]);
    }
    
    // Initialize carousel timer
    setFormCarouselTimer(taskData?.carousel_timer || 5);
    
    // Reset selected image index
    setSelectedImageIndex(0);
  }, [taskData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        // Update the current image in the array
        const newImages = [...backgroundImages];
        if (selectedImageIndex < newImages.length) {
          newImages[selectedImageIndex] = base64String;
        } else {
          // If uploading to an empty slot, add the image to the array
          newImages.push(base64String);
        }
        
        setBackgroundImages(newImages);
        form.setValue('background_images', newImages);
        
        // Also update single image for backward compatibility
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectThumbnail = (index: number) => {
    setSelectedImageIndex(index);
    
    // If we have an image at this index, show it in the preview
    if (index < backgroundImages.length) {
      setImagePreview(backgroundImages[index]);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveCurrentImage = () => {
    // Remove the image at the selected index
    const newImages = [...backgroundImages];
    
    if (selectedImageIndex < newImages.length) {
      newImages.splice(selectedImageIndex, 1);
      setBackgroundImages(newImages);
      form.setValue('background_images', newImages);
      
      // Update preview to the next available image or clear it
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
        description: "Custom icon has been applied to the task",
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

  const handleSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    
    try {
      const taskToSave: Partial<Task> = {
        ...values,
        id: taskData?.id,
        icon_name: selectedIconName || undefined,
        background_images: backgroundImages,
        carousel_timer: formCarouselTimer,
      };
      
      await onSave(taskToSave);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
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
    setFormCarouselTimer(newValue);
    form.setValue('carousel_timer', newValue);
    
    // Update global timer immediately if provided
    if (updateCarouselTimer) {
      updateCarouselTimer(newValue);
    }
  };

  const handleDelete = () => {
    if (taskData?.id && onDelete) {
      onDelete(taskData.id);
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
                  placeholder="Task title" 
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
                  placeholder="Task description" 
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
          
          {/* Background image selector - shows the currently selected image */}
          <BackgroundImageSelector
            control={form.control}
            imagePreview={imagePreview}
            initialPosition={{ 
              x: taskData?.focal_point_x || 50, 
              y: taskData?.focal_point_y || 50 
            }}
            onRemoveImage={handleRemoveCurrentImage}
            onImageUpload={handleImageUpload}
            setValue={form.setValue}
          />
          
          {/* Thumbnails row */}
          <div className="flex gap-2 items-end mt-4 overflow-x-auto py-2">
            {[0, 1, 2, 3, 4].map((index) => {
              const imageUrl = backgroundImages[index] || '';
              return (
                <div
                  key={index}
                  onClick={() => handleSelectThumbnail(index)}
                  className={`w-12 h-12 rounded-md cursor-pointer transition-all flex-shrink-0
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
                        // Use a placeholder on error
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgNEg4LjhDNy4xMTk4NCA0IDUuNzM5NjggNC44Mi40LjJWMjBIMTZWMTVIMjAuNkMyMS45MjU1IDE1IDIzIDE2LjA3NDUgMjMgMTcuNFYyMEg0VjE3LjRDNyAxNi4wNzQ1IDguMDc0NTIgMTUgOS40IDE1SDEzVjRaIiBzdHJva2U9IiM0QjU1NjMiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0xOSA4QzE5IDkuMTA0NTcgMTguMTA0NiAxMCAxNyAxMEMxNS44OTU0IDEwIDE1IDkuMTA0NTcgMTUgOEMxNSA2Ljg5NTQzIDE1Ljg5NTQgNiAxNyA2QzE4LjEwNDYgNiAxOSA2Ljg5NTQzIDE5IDhaIiBmaWxsPSIjNEI1NTYzIi8+PC9zdmc+';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-light-navy">
                      <Plus size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Carousel timer slider */}
          <div className="mt-6">
            <FormLabel className="text-white">
              Carousel Timer: {formCarouselTimer} seconds
            </FormLabel>
            <input
              type="range"
              min={3}
              max={20}
              step={1}
              value={formCarouselTimer}
              onChange={(e) => {
                handleCarouselTimerChange(Number(e.target.value));
              }}
              className="w-full h-2 bg-dark-navy rounded-lg appearance-none cursor-pointer my-2"
            />
            <p className="text-xs text-light-navy">
              Control how frequently background images change (3-20 seconds)
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Task Icon</FormLabel>
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
          {taskData?.id && onDelete && (
            <DeleteTaskDialog
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

export default TaskEditorForm;
