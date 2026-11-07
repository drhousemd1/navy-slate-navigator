import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';

import React, { useState } from 'react';
import { Task } from '@/lib/taskUtils';
import TaskFormProvider, { LocalTaskFormValues } from './task-editor/TaskFormProvider';
import { TaskFormValues } from '@/data/tasks/types';
import TaskBasicDetails from './task-editor/TaskBasicDetails';
import NumberField from './task-editor/NumberField';
import ColorPickerField from './task-editor/ColorPickerField';
import PrioritySelector from './task-editor/PrioritySelector';
import { TaskScheduleFields } from './task-editor/TaskScheduleFields';
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
import { readBackgroundDraft, captureDraftImageSession, chooseDraftIcon, reportDraftImageError } from '@/lib/editorDrafts';

interface TaskEditorFormProps {
  atomicAccounting?: boolean;
  taskData?: Partial<Task>;
  onSave: (taskData: LocalTaskFormValues) => Promise<void>; 
  onDelete?: (taskId: string) => Promise<void>;
  onCancel: () => void;
}

const TaskEditorForm: React.FC<TaskEditorFormProps> = ({ 
  atomicAccounting = false,
  taskData,
  onSave,
  onDelete,
  onCancel
}) => {
  const text = useCoreTextClasses();
  const [loading, setLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <TaskFormProvider
      taskData={taskData}
      formBaseId="task-editor"
    >
      {(form, clearPersistedState) => {
        const imagePreview = form.watch('background_image_url') ?? null;
        const iconPreview = form.watch('icon_url') ?? null;
        const handleSaveWithClear = async (formData: LocalTaskFormValues) => {
          setOperationError(null);
          setLoading(true);
          try {
            if (!atomicAccounting && (formData.frequency === 'once' || formData.mandatory || formData.deadline_time)) throw new Error('This task type requires the rebuilt accounting system.');
            await onSave(formData);
            await clearPersistedState(); 
            onCancel();
          } catch (e: unknown) {
            const descriptiveMessage = getErrorMessage(e);
            setOperationError(descriptiveMessage);
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

        const handleCancelWithClear = async () => {
          if (await clearPersistedState()) onCancel();
        };

        const handleDeleteWithClear = async (taskId: string) => {
          if (onDelete && !loading) {
            setOperationError(null);
            setLoading(true);
            try {
              await onDelete(taskId);
              await clearPersistedState();
              onCancel();
            } catch (error) {
              logger.error('[TaskEditorForm] Error deleting task:', error);
              setOperationError(getErrorMessage(error));
              toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
            } finally {
              setLoading(false);
            }
          }
        };

        const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const applyImage = captureDraftImageSession(form);
          try {
            const { url, metadata } = await readBackgroundDraft(file);
            applyImage(() => {
              form.setValue('background_image_url', url, { shouldDirty: true });
              form.setValue('image_meta', metadata, { shouldDirty: true });
            });
          } catch { reportDraftImageError(); }
        };

        const handleIconUpload = () => {
          const applyImage = captureDraftImageSession(form);
          chooseDraftIcon(url => applyImage(() => {
            form.setValue('icon_url', url, { shouldDirty: true });
            form.setValue('icon_name', null, { shouldDirty: true });
          }));
        };

        const handleIconSelect = (iconName: string) => {
          if (iconName.startsWith('custom:')) {
            const iconUrl = iconName.substring(7);
            form.setValue('icon_url', iconUrl);
            form.setValue('icon_name', null);
            
            toast({
              title: "Custom icon selected",
              description: "Custom icon has been applied to the task",
            });
          } else {
            form.setValue('icon_name', iconName);
            form.setValue('icon_url', null);
            
            toast({
              title: "Icon selected",
              description: `${iconName} icon selected`,
            });
          }
        };

        return (
          <form onSubmit={form.handleSubmit(handleSaveWithClear)} className="space-y-6">
            {operationError && <p role="alert" className={text.warning}>{operationError}</p>}
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
            
            <TaskScheduleFields form={form} atomic={atomicAccounting} disabled={loading} />
            
            <div className="space-y-4">
              <FormLabel className={`${text.primary} text-lg`}>Background Image</FormLabel>
              <TaskImageSection
                control={form.control}
                imagePreview={imagePreview} 
                initialPosition={{ 
                  x: form.watch('focal_point_x') ?? 50,
                  y: form.watch('focal_point_y') ?? 50
                }}
                onRemoveImage={() => {
                  form.setValue('background_image_url', null);
                  form.setValue('image_meta', null);
                }}
                onImageUpload={handleImageUploadWrapper}
                setValue={form.setValue} 
              />
            </div>
            
            <div className="space-y-4">
              <FormLabel className={`${text.primary} text-lg`}>Task Icon</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                  <IconSelector
                    selectedIconName={form.watch('icon_name')} 
                    iconPreview={iconPreview} 
                    iconColor={form.watch('icon_color')}
                    onSelectIcon={handleIconSelect}
                    onUploadIcon={handleIconUpload}
                    onRemoveIcon={() => {
                      form.setValue('icon_url', null);
                      form.setValue('icon_name', null);
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
                    <FormLabel className={text.primary}>Highlight Effect</FormLabel>
                    <p className={`text-sm ${text.primary}`}>Apply a yellow highlight behind title and description</p>
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
              atomicAccounting={atomicAccounting}
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
