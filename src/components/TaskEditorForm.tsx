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
import NumberField from './task-editor/NumberField';
import ColorPickerField from './task-editor/ColorPickerField';
import PrioritySelector from './task-editor/PrioritySelector';
import FrequencySelector from './task-editor/FrequencySelector';
import BackgroundImageSelector from './task-editor/BackgroundImageSelector';
import IconSelector from './task-editor/IconSelector';
import PredefinedIconsGrid from './task-editor/PredefinedIconsGrid';
import DeleteTaskDialog from './task-editor/DeleteTaskDialog';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';

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
  onSave: (taskData: any) => Promise<void>; // Changed from (taskData: any) => void to Promise<void> for async operations
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
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<TaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      points: 5,
      frequency: 'daily',
      frequency_count: 1,
      background_image_url: undefined,
      background_opacity: 100,
      icon_url: undefined,
      icon_name: undefined,
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      icon_color: '#9b87f5',
      highlight_effect: false,
      focal_point_x: 50,
      focal_point_y: 50,
      priority: 'medium',
    },
  });

  const { reset, watch, setValue, control, handleSubmit: formHandleSubmit } = form;

  const persisterFormId = `task-editor-${taskData?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: ['background_image_url', 'icon_url'] 
  });

  useEffect(() => {
    if (taskData) {
      reset({
        title: taskData.title || '',
        description: taskData.description || '',
        points: taskData.points || 5,
        frequency: (taskData.frequency as 'daily' | 'weekly') || 'daily',
        frequency_count: taskData.frequency_count || 1,
        background_image_url: taskData.background_image_url || undefined,
        background_opacity: taskData.background_opacity || 100,
        icon_url: taskData.icon_url || undefined,
        icon_name: taskData.icon_name || undefined,
        title_color: taskData.title_color || '#FFFFFF',
        subtext_color: taskData.subtext_color || '#8E9196',
        calendar_color: taskData.calendar_color || '#7E69AB',
        icon_color: taskData.icon_color || '#9b87f5',
        highlight_effect: taskData.highlight_effect || false,
        focal_point_x: taskData.focal_point_x || 50,
        focal_point_y: taskData.focal_point_y || 50,
        priority: taskData.priority || 'medium',
      });
      setImagePreview(taskData.background_image_url || null);
      setIconPreview(taskData.icon_url || null);
      setSelectedIconName(taskData.icon_name || null);
    } else {
      // For new tasks, form persister will load if data exists, otherwise defaultValues are used.
      // Explicit reset might override persisted new form state if not careful.
      // Let persister handle initial load for 'new' form.
      // If taskData is undefined, useFormStatePersister handles loading or defaults.
      // However, imagePreview, iconPreview, selectedIconName are not part of form state directly managed by RHF.
      // We need to ensure they are reset or loaded correctly based on persisted form values if applicable.
      // For now, new form means fresh previews.
      setImagePreview(null);
      setIconPreview(null);
      setSelectedIconName(null);
    }
  }, [taskData, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        // setValue('background_image_url', base64String); // This will be persisted if not excluded
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
            // setValue('icon_url', base64String); // This will be persisted if not excluded
            // setValue('icon_name', undefined);
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
      setValue('icon_url', iconUrl);
      setValue('icon_name', undefined);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the task",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      setValue('icon_name', iconName);
      setValue('icon_url', undefined); // Ensure icon_url is cleared if a named icon is selected
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };

  const onSubmitWrapped = async (values: TaskFormValues) => {
    setLoading(true);
    try {
      const taskToSave: Partial<Task> = {
        ...values,
        id: taskData?.id,
        icon_name: selectedIconName || undefined,
        // If icon_url and background_image_url are excluded from persistence,
        // they should be explicitly read from their previews if needed here
        icon_url: iconPreview || values.icon_url, // Prioritize live preview, fallback to form value
        background_image_url: imagePreview || values.background_image_url, // Prioritize live preview
      };
      
      await onSave(taskToSave);
      await clearPersistedState(); // Clear persisted state on successful save
      // onSave should handle closing the editor, so onCancel isn't called here.
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

  const handleCancelWrapped = () => {
    clearPersistedState();
    onCancel();
  };

  const handleDeleteWrapped = () => {
    if (taskData?.id && onDelete) {
      onDelete(taskData.id);
      clearPersistedState(); // Clear persisted state on delete
    }
    setIsDeleteDialogOpen(false); // Close dialog regardless of onDelete outcome
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


  return (
    <Form {...form}>
      <form onSubmit={formHandleSubmit(onSubmitWrapped)} className="space-y-6">
        <FormField
          control={control}
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
          control={control}
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
          <PrioritySelector control={control} />
          
          <NumberField
            control={control}
            name="points"
            label="Points"
            onIncrement={incrementPoints}
            onDecrement={decrementPoints}
            minValue={0}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FrequencySelector control={control} />
          
          <NumberField
            control={control}
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
            control={control}
            imagePreview={imagePreview} // This is the state variable
            initialPosition={{ 
              x: watch('focal_point_x') || 50, 
              y: watch('focal_point_y') || 50 
            }}
            onRemoveImage={() => {
              setImagePreview(null);
              // setValue('background_image_url', undefined); // This will be persisted if not excluded
            }}
            onImageUpload={handleImageUpload}
            setValue={setValue} // For focal_point_x, focal_point_y, background_opacity
          />
        </div>
        
        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Task Icon</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
              <IconSelector
                selectedIconName={selectedIconName} // This is the state variable
                iconPreview={iconPreview} // This is the state variable
                iconColor={watch('icon_color')}
                onSelectIcon={handleIconSelect}
                onUploadIcon={handleIconUpload}
                onRemoveIcon={() => {
                  setIconPreview(null);
                  setSelectedIconName(null);
                  // setValue('icon_url', undefined); // This will be persisted if not excluded
                  // setValue('icon_name', undefined); // This will be persisted
                }}
              />
            </div>
            
            <PredefinedIconsGrid
              selectedIconName={selectedIconName}
              iconColor={watch('icon_color')}
              onSelectIcon={handleIconSelect}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorPickerField 
            control={control} 
            name="title_color" 
            label="Title Color" 
          />
          
          <ColorPickerField 
            control={control} 
            name="subtext_color" 
            label="Subtext Color" 
          />
          
          <ColorPickerField 
            control={control} 
            name="calendar_color" 
            label="Calendar Color" 
          />
          
          <ColorPickerField 
            control={control} 
            name="icon_color" 
            label="Icon Color" 
          />
        </div>
        
        <FormField
          control={control}
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
              onDelete={handleDeleteWrapped}
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
