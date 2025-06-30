
import React, { useState, useEffect } from 'react';
import { Task } from '@/lib/taskUtils';
import TaskFormProvider, { TaskFormValues } from './task-editor/TaskFormProvider';
import TaskBasicDetails from './task-editor/TaskBasicDetails';
import NumberField from './task-editor/NumberField';
import ColorPickerField from './task-editor/ColorPickerField';
import PrioritySelector from './task-editor/PrioritySelector';
import FrequencySelector from './task-editor/FrequencySelector';
import TaskImageSection from './task-editor/TaskImageSection';
import IconSelector from './task-editor/IconSelector';
import PredefinedIconsGrid from './task-editor/PredefinedIconsGrid';
import TaskFormActions from './task-editor/TaskFormActions';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { handleImageUpload } from '@/utils/image/taskIntegration';
import { useIsMobile } from '@/hooks/use-mobile';

interface TaskEditorFormProps {
  taskData?: Partial<Task>;
  onSave: (taskData: TaskFormValues) => Promise<void>; 
  onDelete?: (taskId: string) => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Defensive blur for mobile to prevent auto-focus
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    if (taskData) {
      setImagePreview(taskData.background_image_url || null);
      setIconPreview(taskData.icon_url || null);
    } else {
      setImagePreview(null);
      setIconPreview(null);
    }
  }, [taskData]);

  return (
    <TaskFormProvider
      taskData={taskData}
      formBaseId="task-editor"
      persisterExclude={['background_image_url', 'icon_url', 'image_meta']}
    >
      {(form, clearPersistedState) => {
        const handleSaveWithClear = async (formData: TaskFormValues) => {
          setLoading(true);
          try {
            const taskToSave: TaskFormValues = {
              ...formData,
              background_image_url: imagePreview || formData.background_image_url,
              icon_url: iconPreview || formData.icon_url,
              icon_name: form.watch('icon_name'),
            };
            
            await onSave(taskToSave);
            await clearPersistedState(); 
            onCancel();
          } catch (e: unknown) {
            const descriptiveMessage = getErrorMessage(e);
            logger.error('Error saving task:', descriptiveMessage, e);
            toast({
              title: "Error Saving Task",
              description: descriptiveMessage,
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        };

        const handleCancelWithClear = () => {
          clearPersistedState();
          onCancel();
        };

        const handleDeleteWithClear = async (taskId: string) => {
          if (onDelete) {
            try {
              await onDelete(taskId);
              onCancel();
            } catch (error) {
              logger.error('[TaskEditorForm] Error deleting task:', error);
              toast({ title: "Error", description: "Failed to delete task. Please try again.", variant: "destructive" });
            }
          }
        };

        const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              await handleImageUpload(
                file,
                form.setValue,
                setImagePreview
              );
            } catch (error) {
              logger.error('Error handling image upload:', error);
              toast({
                title: "Image Upload Error",
                description: "Failed to process the uploaded image",
                variant: "destructive"
              });
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
            form.setValue('icon_url', iconUrl);
            form.setValue('icon_name', undefined);
            
            toast({
              title: "Custom icon selected",
              description: "Custom icon has been applied to the task",
            });
          } else {
            setIconPreview(null);
            form.setValue('icon_name', iconName);
            form.setValue('icon_url', undefined); 
            
            toast({
              title: "Icon selected",
              description: `${iconName} icon selected`,
            });
          }
        };

        return (
          <form onSubmit={form.handleSubmit(handleSaveWithClear)} className="space-y-6">
            <TaskBasicDetails control={form.control} isSaving={loading} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PrioritySelector control={form.control} />
              
              <NumberField
                control={form.control}
                name="points"
                label="Points"
                onIncrement={() => {
                  const currentPoints = form.getValues('points');
                  form.setValue('points', currentPoints + 1);
                }}
                onDecrement={() => {
                  const currentPoints = form.getValues('points');
                  form.setValue('points', Math.max(0, currentPoints - 1));
                }}
                minValue={0}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FrequencySelector control={form.control} />
              
              <NumberField
                control={form.control}
                name="frequency_count"
                label="Times per period"
                onIncrement={() => {
                  const currentCount = form.getValues('frequency_count');
                  form.setValue('frequency_count', currentCount + 1);
                }}
                onDecrement={() => {
                  const currentCount = form.getValues('frequency_count');
                  if (currentCount > 1) {
                    form.setValue('frequency_count', currentCount - 1);
                  }
                }}
                minValue={1}
              />
            </div>
            
            <div className="space-y-4">
              <FormLabel className="text-white text-lg">Background Image</FormLabel>
              <TaskImageSection
                control={form.control}
                imagePreview={imagePreview} 
                initialPosition={{ 
                  x: form.watch('focal_point_x') || 50, 
                  y: form.watch('focal_point_y') || 50 
                }}
                onRemoveImage={() => {
                  setImagePreview(null);
                  form.setValue('background_image_url', undefined);
                }}
                onImageUpload={handleImageUploadWrapper}
                setValue={form.setValue} 
              />
            </div>
            
            <div className="space-y-4">
              <FormLabel className="text-white text-lg">Task Icon</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                  <IconSelector
                    selectedIconName={form.watch('icon_name')} 
                    iconPreview={iconPreview} 
                    iconColor={form.watch('icon_color')}
                    onSelectIcon={handleIconSelect}
                    onUploadIcon={handleIconUpload}
                    onRemoveIcon={() => {
                      setIconPreview(null);
                      form.setValue('icon_url', undefined);
                      form.setValue('icon_name', undefined);
                    }}
                  />
                </div>
                
                <PredefinedIconsGrid
                  selectedIconName={form.watch('icon_name')}
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
            
            <TaskFormActions 
              taskData={taskData}
              isSaving={loading}
              isDeleteDialogOpen={isDeleteDialogOpen}
              setIsDeleteDialogOpen={setIsDeleteDialogOpen}
              onCancel={handleCancelWithClear}
              onDelete={taskData?.id ? () => handleDeleteWithClear(taskData.id!) : undefined}
            />
          </form>
        );
      }}
    </TaskFormProvider>
  );
};

export default TaskEditorForm;
