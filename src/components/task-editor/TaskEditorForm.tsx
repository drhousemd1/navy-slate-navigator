import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  useEffect(() => {
    setImagePreview(taskData?.background_image_url || null);
    setIconPreview(taskData?.icon_url || null);
    setSelectedIconName(taskData?.icon_name || null);
  }, [taskData]);

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
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      form.setValue('icon_name', iconName);
      form.setValue('icon_url', undefined);
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

  const handleDelete = () => {
    if (taskData?.id && onDelete) {
      onDelete(taskData.id);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div>
          <label>Title</label>
          <input value={form.watch('title')} onChange={(e) => form.setValue('title', e.target.value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Description</label>
          <Textarea value={form.watch('description')} onChange={(e) => form.setValue('description', e.target.value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Points</label>
          <NumberField value={form.watch('points')} onChange={(value) => form.setValue('points', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Frequency</label>
          <FrequencySelector value={form.watch('frequency')} onChange={(value) => form.setValue('frequency', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Frequency Count</label>
          <NumberField value={form.watch('frequency_count')} onChange={(value) => form.setValue('frequency_count', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Background Image</label>
          <input type="file" onChange={handleImageUpload} className="w-full border px-2 py-1" />
          {imagePreview && <img src={imagePreview} alt="Background Image" className="w-full h-40 mt-2" />}
        </div>
        <div className="mt-2">
          <label>Background Opacity</label>
          <NumberField value={form.watch('background_opacity')} onChange={(value) => form.setValue('background_opacity', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Icon</label>
          <IconSelector value={form.watch('icon_name')} onChange={handleIconSelect} className="w-full border px-2 py-1" />
          {iconPreview && <img src={iconPreview} alt="Icon" className="w-full h-40 mt-2" />}
        </div>
        <div className="mt-2">
          <label>Title Color</label>
          <ColorPickerField value={form.watch('title_color')} onChange={(value) => form.setValue('title_color', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Subtext Color</label>
          <ColorPickerField value={form.watch('subtext_color')} onChange={(value) => form.setValue('subtext_color', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Calendar Color</label>
          <ColorPickerField value={form.watch('calendar_color')} onChange={(value) => form.setValue('calendar_color', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Icon Color</label>
          <ColorPickerField value={form.watch('icon_color')} onChange={(value) => form.setValue('icon_color', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Highlight Effect</label>
          <Switch checked={form.watch('highlight_effect')} onChange={(value) => form.setValue('highlight_effect', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Focal Point X</label>
          <NumberField value={form.watch('focal_point_x')} onChange={(value) => form.setValue('focal_point_x', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Focal Point Y</label>
          <NumberField value={form.watch('focal_point_y')} onChange={(value) => form.setValue('focal_point_y', value)} className="w-full border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label>Priority</label>
          <PrioritySelector value={form.watch('priority')} onChange={(value) => form.setValue('priority', value)} className="w-full border px-2 py-1" />
        </div>
        <button type="submit" className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Save</button>
      </form>
    </Form>
  );
};

export default TaskEditorForm;
