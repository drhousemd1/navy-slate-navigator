
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Task, TaskFormValues } from '@/data/tasks/types';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import PrioritySelector from './task-editor/PrioritySelector';
import FrequencySelector from './task-editor/FrequencySelector';
import ColorPickerField from './task-editor/ColorPickerField';
import NumberField from './task-editor/NumberField';
import IconSelector from './task-editor/IconSelector';
import PredefinedIconsGrid from './task-editor/PredefinedIconsGrid';
import DeleteTaskDialog from './task-editor/DeleteTaskDialog';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.string(),
  frequency: z.string(),
  frequency_count: z.number().min(1).max(30),
  points: z.number().min(0).max(1000),
  background_image_url: z.string().optional(),
  background_opacity: z.number().min(0).max(100),
  icon_url: z.string().optional(),
  icon_name: z.string().optional(),
  title_color: z.string(),
  subtext_color: z.string(),
  calendar_color: z.string(),
  icon_color: z.string(),
  highlight_effect: z.boolean(),
  focal_point_x: z.number().min(0).max(100),
  focal_point_y: z.number().min(0).max(100),
});

type FormValues = z.infer<typeof taskFormSchema>;

interface TaskEditorFormProps {
  task?: Task;
  onSave: (taskData: TaskFormValues) => Promise<void>;
  onDelete?: (taskId: string) => void;
  onCancel: () => void;
}

const TaskEditorForm: React.FC<TaskEditorFormProps> = ({
  task,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      frequency: 'daily',
      frequency_count: 1,
      points: 10,
      background_image_url: '',
      background_opacity: 100,
      icon_url: '',
      icon_name: '',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      icon_color: '#9b87f5',
      highlight_effect: false,
      focal_point_x: 50,
      focal_point_y: 50,
    },
  });

  const { reset, watch, setValue, control, handleSubmit } = form;

  useEffect(() => {
    if (task) {
      reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority as string || 'medium',
        frequency: task.frequency as string || 'daily',
        frequency_count: task.frequency_count || 1,
        points: task.points || 10,
        background_image_url: task.background_image_url || '',
        background_opacity: task.background_opacity || 100,
        icon_url: task.icon_url || '',
        icon_name: task.icon_name || '',
        title_color: task.title_color || '#FFFFFF',
        subtext_color: task.subtext_color || '#8E9196',
        calendar_color: task.calendar_color || '#7E69AB',
        icon_color: task.icon_color || '#9b87f5',
        highlight_effect: task.highlight_effect || false,
        focal_point_x: task.focal_point_x || 50,
        focal_point_y: task.focal_point_y || 50,
      });
      setSelectedIconName(task.icon_name || null);
    }
  }, [task, reset]);

  const handleImageUpload = () => {
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
            setValue('background_image_url', base64String);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleRemoveImage = () => {
    setValue('background_image_url', '');
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
            setSelectedIconName(null);
            setValue('icon_url', base64String);
            setValue('icon_name', '');
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleSelectIcon = (iconName: string) => {
    setSelectedIconName(iconName);
    setValue('icon_name', iconName);
    setValue('icon_url', '');
  };

  const handleRemoveIcon = () => {
    setSelectedIconName(null);
    setValue('icon_url', '');
    setValue('icon_name', '');
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const taskToSave: TaskFormValues = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        frequency: values.frequency,
        frequency_count: values.frequency_count,
        points: values.points,
        background_image_url: values.background_image_url,
        background_opacity: values.background_opacity,
        icon_url: values.icon_url || undefined,
        icon_name: selectedIconName || undefined,
        title_color: values.title_color,
        subtext_color: values.subtext_color,
        calendar_color: values.calendar_color,
        icon_color: values.icon_color,
        highlight_effect: values.highlight_effect,
        focal_point_x: values.focal_point_x,
        focal_point_y: values.focal_point_y,
      };
      
      await onSave(taskToSave);
    } catch (error) {
      logger.error('Error saving task:', error);
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
    setValue('points', Math.min((watch('points') || 0) + 5, 1000));
  };

  const decrementPoints = () => {
    setValue('points', Math.max((watch('points') || 0) - 5, 0));
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  autoFocus={false}
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
                  {...field} value={field.value || ''}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrioritySelector control={control} />
          <FrequencySelector control={control} />
        </div>

        <NumberField
          control={control}
          name="points"
          label="Points"
          onIncrement={incrementPoints}
          onDecrement={decrementPoints}
          minValue={0}
          maxValue={1000}
        />

        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Background Image</FormLabel>
          
          <div className="border-2 border-dashed border-light-navy rounded-lg p-4">
            {watch('background_image_url') ? (
              <div className="space-y-4">
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={watch('background_image_url')}
                    alt="Task background preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Background image uploaded
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleImageUpload}
                >
                  Upload Background Image
                </Button>
                <p className="text-sm text-gray-400 mt-2">
                  Upload an image to use as the task background
                </p>
              </div>
            )}
          </div>

          {watch('background_image_url') && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="background_opacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Background Opacity</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                    </FormControl>
                    <div className="text-sm text-gray-400">{field.value}%</div>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={control}
                  name="focal_point_x"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Focal X</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="focal_point_y"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Focal Y</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Task Icon</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
              <IconSelector
                selectedIconName={selectedIconName}
                iconPreview={watch('icon_url')}
                iconColor={watch('icon_color')}
                onSelectIcon={handleSelectIcon}
                onUploadIcon={handleIconUpload}
                onRemoveIcon={handleRemoveIcon}
              />
            </div>
            <PredefinedIconsGrid
              selectedIconName={selectedIconName}
              iconColor={watch('icon_color')}
              onSelectIcon={handleSelectIcon}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorPickerField control={control} name="title_color" label="Title Color" />
          <ColorPickerField control={control} name="subtext_color" label="Subtext Color" />
          <ColorPickerField control={control} name="calendar_color" label="Calendar Color" />
          <ColorPickerField control={control} name="icon_color" label="Icon Color" />
        </div>

        <FormField
          control={control}
          name="highlight_effect"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-white">Highlight Effect</FormLabel>
                <p className="text-sm text-gray-400">Apply a yellow highlight behind title and description</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          {task?.id && onDelete && (
            <DeleteTaskDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={() => onDelete(task.id)}
              taskName={task?.title || 'this task'}
            />
          )}
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Task'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TaskEditorForm;
