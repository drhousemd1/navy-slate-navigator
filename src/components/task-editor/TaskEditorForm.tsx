
import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
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
}

interface TaskEditorFormProps {
  taskData?: Partial<Task>;
  onSave: (taskData: any) => void;
  onDelete?: (taskId: string) => void;
  onCancel: () => void;
}

const TaskEditorForm: React.FC<TaskEditorFormProps> = ({ 
  taskData,
  onSave,
  onDelete,
  onCancel
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
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
    },
  });

  React.useEffect(() => {
    setImagePreview(taskData?.background_image_url || null);
    setIconPreview(taskData?.icon_url || null);
    setSelectedIconName(taskData?.icon_name || null);
    setPosition({
      x: taskData?.focal_point_x || 50,
      y: taskData?.focal_point_y || 50
    });
  }, [taskData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    
    e.preventDefault();
    console.log("Mouse down - Setting isDragging to true", { x: e.clientX, y: e.clientY });
    setIsDragging(true);
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    console.log("Initial position set to:", { x, y });
    setPosition({ x, y });
    form.setValue('focal_point_x', Math.round(x));
    form.setValue('focal_point_y', Math.round(y));
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      console.log("Dragging", { 
        clientX: moveEvent.clientX, 
        clientY: moveEvent.clientY,
        isDragging: true
      });
      
      if (!imageContainerRef.current) return;
      
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      
      console.log("Moving position to:", { x, y });
      setPosition({ x, y });
      form.setValue('focal_point_x', Math.round(x));
      form.setValue('focal_point_y', Math.round(y));
    };
    
    const handleMouseUp = () => {
      console.log("Mouse up - Setting isDragging to false");
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageContainerRef.current || e.touches.length === 0) return;
    
    console.log("Touch start - Setting isDragging to true");
    setIsDragging(true);
    
    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    
    console.log("Initial touch position set to:", { x, y });
    setPosition({ x, y });
    form.setValue('focal_point_x', Math.round(x));
    form.setValue('focal_point_y', Math.round(y));
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      console.log("Touch Dragging", { 
        isDragging: true,
        touchesLength: moveEvent.touches.length
      });
      
      if (!imageContainerRef.current || moveEvent.touches.length === 0) return;
      
      moveEvent.preventDefault();
      
      const touch = moveEvent.touches[0];
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      
      console.log("Moving touch position to:", { x, y });
      setPosition({ x, y });
      form.setValue('focal_point_x', Math.round(x));
      form.setValue('focal_point_y', Math.round(y));
    };
    
    const handleTouchEnd = () => {
      console.log("Touch end - Setting isDragging to false");
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
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
          <FormLabel className="text-white text-lg">Background Image</FormLabel>
          <BackgroundImageSelector
            control={form.control}
            imagePreview={imagePreview}
            position={position}
            isDragging={isDragging}
            onRemoveImage={() => {
              setImagePreview(null);
              form.setValue('background_image_url', undefined);
            }}
            onImageUpload={handleImageUpload}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
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
