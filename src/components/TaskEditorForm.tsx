
import React, { useState, useRef } from 'react';
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

const TaskEditorForm = ({
  taskData = {},
  onSave,
  onDelete,
  onCancel,
  updateCarouselTimer,
  sharedImageIndex = 0
}) => {
  const form = useForm({ defaultValues: taskData });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    taskData?.background_image_url || (taskData?.background_images && taskData.background_images[0]) || null
  );

  const handleSubmit = (data) => {
    onSave({ ...taskData, ...data });
  };

  // Mock handlers for the BackgroundImageSelector
  const handleImageUpload = (e) => {
    console.log("Image would be uploaded here");
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const initialPosition = { 
    x: taskData?.focal_point_x || 50, 
    y: taskData?.focal_point_y || 50 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Task description" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <NumberField
          control={form.control}
          name="points"
          label="Points"
        />

        <ColorPickerField
          control={form.control}
          name="background_opacity"
          label="Background Opacity"
        />

        <FrequencySelector control={form.control} />

        <PrioritySelector control={form.control} />

        <IconSelector 
          selectedIconName={form.watch("icon_name")}
          iconPreview={form.watch("icon_url")}
          iconColor={form.watch("icon_color") || "#000000"}
          onSelectIcon={(icon) => form.setValue("icon_name", icon)}
          onUploadIcon={() => console.log("Upload icon")}
          onRemoveIcon={() => {
            form.setValue("icon_name", undefined);
            form.setValue("icon_url", undefined);
          }}
        />

        <PredefinedIconsGrid
          selectedIconName={form.watch("icon_name")}
          iconColor={form.watch("icon_color") || "#000000"}
          onSelectIcon={(icon) => form.setValue("icon_name", icon)}
        />

        <BackgroundImageSelector
          imagePreview={imagePreview}
          initialPosition={initialPosition}
          onRemoveImage={handleRemoveImage}
          onImageUpload={handleImageUpload}
          setValue={form.setValue}
          control={form.control}
          backgroundImages={taskData?.background_images || []}
          selectedImageIndex={0}
          onSelectImage={(idx) => console.log("Selected image", idx)}
          background_opacity={form.watch("background_opacity") || 100}
        />

        <div className="flex justify-between mt-6">
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Task
          </Button>
          <div className="flex gap-2">
            {taskData.id && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </Button>
                <DeleteTaskDialog
                  isOpen={showDeleteDialog}
                  onOpenChange={setIsDeleteDialog}
                  onDelete={() => {
                    if (onDelete) onDelete(taskData.id);
                    setShowDeleteDialog(false);
                  }}
                />
              </>
            )}
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default TaskEditorForm;
