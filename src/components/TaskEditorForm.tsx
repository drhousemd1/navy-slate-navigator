import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Task, TaskFrequency } from '@/lib/taskUtils';
import BasicDetailsSection from './task-editor/BasicDetailsSection';
import IconSection from './task-editor/IconSection';
import ColorSchemeSection from './task-editor/ColorSchemeSection';
import BackgroundImageSection from './task-editor/BackgroundImageSection';
import FrequencySection from './task-editor/FrequencySection';
import { useTaskFormImageHandling } from './task-editor/hooks/useTaskFormImageHandling';
import { useTaskFormIconHandling } from './task-editor/hooks/useTaskFormIconHandling';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2, Save } from 'lucide-react';
import DeleteTaskDialog from './task/DeleteTaskDialog'; // Make sure this component exists
import { logger } from '@/lib/logger';

// ... keep existing code (schema definition)
const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  points: z.coerce.number().min(0, "Points must be 0 or greater"),
  
  icon_color: z.string().optional().default('#FFFFFF'),
  title_color: z.string().optional().default('#FFFFFF'),
  subtext_color: z.string().optional().default('#8E9196'),
  calendar_color: z.string().optional().default('#4ADE80'), // Default to a green shade
  highlight_effect: z.boolean().optional().default(false),

  background_opacity: z.coerce.number().min(0).max(100).optional().default(50),
  focal_point_x: z.coerce.number().min(0).max(100).optional().default(50),
  focal_point_y: z.coerce.number().min(0).max(100).optional().default(50),
  
  frequency: z.nativeEnum(TaskFrequency).default(TaskFrequency.Daily),
  frequency_count: z.coerce.number().min(1, "Count must be at least 1").optional().default(1),
  is_random: z.boolean().optional().default(false),
  is_sub_only: z.boolean().optional().default(false), // New field for sub-only tasks
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskEditorFormProps {
  task?: Task;
  onSave: (data: TaskFormValues, icon_name: string | null, icon_url: string | null, background_image_url: string | null) => Promise<Task | null | void>;
  onDelete?: (taskId: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean; // For external loading state, e.g. during save
}

const TaskEditorForm: React.FC<TaskEditorFormProps> = ({ task, onSave, onDelete, onCancel, isLoading: isExternallyLoading = false }) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      points: task?.points || 10,
      icon_color: task?.icon_color || '#FFFFFF',
      title_color: task?.title_color || '#FFFFFF',
      subtext_color: task?.subtext_color || '#8E9196',
      calendar_color: task?.calendar_color || '#4ADE80',
      highlight_effect: task?.highlight_effect || false,
      background_opacity: task?.background_opacity || 50,
      focal_point_x: task?.focal_point_x || 50,
      focal_point_y: task?.focal_point_y || 50,
      frequency: task?.frequency || TaskFrequency.Daily,
      frequency_count: task?.frequency_count || 1,
      is_random: task?.is_random || false,
      is_sub_only: task?.is_sub_only || false,
    },
  });

  const formId = `task-editor-${task?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(formId, form, {
    exclude: [] // No exclusions by default, persist all
  });

  const { imagePreview, handleImageUpload, handleRemoveImage, setImagePreview, initialPosition } = useTaskFormImageHandling(
    task?.background_image_url,
    { x: task?.focal_point_x || 50, y: task?.focal_point_y || 50 }
  );
  
  const { selectedIconName, iconPreview, iconColor, handleSelectIcon, handleUploadIcon, handleRemoveIcon, setSelectedIconName, setIconPreview } = useTaskFormIconHandling(
    task?.icon_name,
    task?.icon_url,
    form.watch('icon_color') || '#FFFFFF'
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Internal saving state

  // Sync external loading state with internal
  useEffect(() => {
    setIsSaving(isExternallyLoading);
  }, [isExternallyLoading]);

  useEffect(() => {
    if (task?.background_image_url) setImagePreview(task.background_image_url);
    if (task?.icon_name) setSelectedIconName(task.icon_name);
    if (task?.icon_url) setIconPreview(task.icon_url);
    // Reset form with task data when task prop changes (e.g., editing a different task)
    form.reset({
      title: task?.title || '',
      description: task?.description || '',
      points: task?.points || 10,
      icon_color: task?.icon_color || '#FFFFFF',
      title_color: task?.title_color || '#FFFFFF',
      subtext_color: task?.subtext_color || '#8E9196',
      calendar_color: task?.calendar_color || '#4ADE80',
      highlight_effect: task?.highlight_effect || false,
      background_opacity: task?.background_opacity || 50,
      focal_point_x: task?.focal_point_x || 50,
      focal_point_y: task?.focal_point_y || 50,
      frequency: task?.frequency || TaskFrequency.Daily,
      frequency_count: task?.frequency_count || 1,
      is_random: task?.is_random || false,
      is_sub_only: task?.is_sub_only || false,
    });
  }, [task, form, setImagePreview, setSelectedIconName, setIconPreview]);


  const onSubmit = async (data: TaskFormValues) => {
    if (isSaving) return; // Prevent double submission
    setIsSaving(true);
    logger.log('Task form submitted with data:', data);
    logger.log('Icon name:', selectedIconName, 'Icon preview (URL/base64):', iconPreview);
    logger.log('Background image (URL/base64):', imagePreview);

    try {
      const savedTask = await onSave(data, selectedIconName, iconPreview, imagePreview);
      if (savedTask) { // onSave might return void if it handles its own success
        toast({ title: task ? "Task Updated" : "Task Created", description: `${data.title} has been saved.` });
        await clearPersistedState(); // Clear form state from storage on successful save
        // onCancel(); // Close form on successful save - This is now handled by the parent component
      }
      // If onSave handles its own toasts, this might be redundant or for fallback.
    } catch (error) {
      logger.error('Error saving task:', error);
      toast({ title: "Save Error", description: error instanceof Error ? error.message : "Could not save the task.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (task?.id && onDelete) {
      setIsSaving(true); // Use saving state for delete operation as well
      try {
        await onDelete(task.id);
        toast({ title: "Task Deleted", description: `${task.title} has been deleted.` });
        await clearPersistedState();
        // onCancel(); // Close form after delete - handled by parent
      } catch (error) {
        logger.error('Error deleting task:', error);
        toast({ title: "Delete Error", description: error instanceof Error ? error.message : "Could not delete the task.", variant: "destructive" });
      } finally {
        setIsSaving(false);
        setIsDeleteDialogOpen(false);
      }
    }
  };

  const handleCancelAndClear = async () => {
    await clearPersistedState();
    onCancel();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-4 md:p-6 bg-card text-card-foreground rounded-lg shadow-lg max-w-3xl mx-auto">
        <BasicDetailsSection control={form.control} />
        <hr className="border-border/50 my-6" />
        <IconSection
          control={form.control}
          selectedIconName={selectedIconName}
          iconPreview={iconPreview}
          iconColor={iconColor} // This comes from useTaskFormIconHandling, which watches form's icon_color
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />
        <hr className="border-border/50 my-6" />
        <ColorSchemeSection control={form.control} />
        <hr className="border-border/50 my-6" />
        <BackgroundImageSection
          control={form.control}
          imagePreview={imagePreview}
          initialPosition={initialPosition}
          onRemoveImage={handleRemoveImage}
          onImageUpload={handleImageUpload}
          setValue={form.setValue}
        />
        <hr className="border-border/50 my-6" />
        <FrequencySection control={form.control} frequency={form.watch('frequency')} />

        <div className="flex flex-col space-y-4 mt-6 md:mt-8">
            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
                {task && onDelete && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={isSaving}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                )}
                <Button 
                    type="button" 
                    variant="outline" // Changed to outline for better visual hierarchy
                    onClick={handleCancelAndClear} 
                    disabled={isSaving}
                    className="border-input hover:bg-muted"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px]"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            {task ? 'Save Changes' : 'Create Task'}
                        </>
                    )}
                </Button>
            </div>
        </div>

        {task && onDelete && (
          <DeleteTaskDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDelete={handleDelete}
            taskName={task.title}
            isDeleting={isSaving} // Pass saving state as isDeleting
          />
        )}
      </form>
    </Form>
  );
};

export default TaskEditorForm;
