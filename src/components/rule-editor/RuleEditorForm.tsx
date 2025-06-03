import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import NumberField from '../task-editor/NumberField';
import ColorPickerField from '../task-editor/ColorPickerField';
import BackgroundImageSelector from '../task-editor/BackgroundImageSelector';
import IconSelector from '../task-editor/IconSelector';
import PredefinedIconsGrid from '../task-editor/PredefinedIconsGrid';
import DeleteRuleDialog from './DeleteRuleDialog';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { logger } from '@/lib/logger';

interface RuleFormValues {
  title: string;
  description: string;
  points_deducted: number;
  dom_points_deducted: number;
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
}

interface RuleEditorFormProps {
  ruleData?: Rule;
  onSave: (ruleData: Partial<Rule>) => Promise<void>;
  onDelete?: (ruleId: string) => void;
  onCancel: () => void;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({
  ruleData,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<RuleFormValues>({
    defaultValues: {
      title: '',
      description: '',
      points_deducted: 5,
      dom_points_deducted: 0,
      background_image_url: undefined,
      background_opacity: 100,
      icon_url: undefined,
      icon_name: undefined,
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      icon_color: '#FF6B6B',
      highlight_effect: false,
      focal_point_x: 50,
      focal_point_y: 50,
    },
  });

  const { reset, watch, setValue, control, handleSubmit } = form;

  const persisterFormId = `rule-editor-${ruleData?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(persisterFormId, form, {
    exclude: ['background_image_url', 'icon_url'] 
  });

  useEffect(() => {
    if (ruleData) {
      reset({
        title: ruleData.title || '',
        description: ruleData.description || '',
        points_deducted: ruleData.points_deducted || 5,
        dom_points_deducted: ruleData.dom_points_deducted || 0,
        background_image_url: ruleData.background_image_url || undefined,
        background_opacity: ruleData.background_opacity || 100,
        icon_url: ruleData.icon_url || undefined,
        icon_name: ruleData.icon_name || undefined,
        title_color: ruleData.title_color || '#FFFFFF',
        subtext_color: ruleData.subtext_color || '#8E9196',
        calendar_color: ruleData.calendar_color || '#7E69AB',
        icon_color: ruleData.icon_color || '#FF6B6B',
        highlight_effect: ruleData.highlight_effect || false,
        focal_point_x: ruleData.focal_point_x || 50,
        focal_point_y: ruleData.focal_point_y || 50,
      });
      setImagePreview(ruleData.background_image_url || null);
      setIconPreview(ruleData.icon_url || null);
      setSelectedIconName(ruleData.icon_name || null);
    } else {
      reset({
        title: '', description: '', points_deducted: 5, dom_points_deducted: 0,
        background_image_url: undefined, background_opacity: 100,
        icon_url: undefined, icon_name: undefined,
        title_color: '#FFFFFF', subtext_color: '#8E9196', calendar_color: '#7E69AB',
        icon_color: '#FF6B6B', highlight_effect: false,
        focal_point_x: 50, focal_point_y: 50,
      });
      setImagePreview(null);
      setIconPreview(null);
      setSelectedIconName(null);
    }
  }, [ruleData, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setValue('background_image_url', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setValue('background_image_url', undefined);
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
            setValue('icon_url', base64String);
            setValue('icon_name', undefined);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleSelectIcon = (iconName: string) => {
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setIconPreview(iconUrl);
      setSelectedIconName(null);
      setValue('icon_url', iconUrl);
      setValue('icon_name', undefined);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the rule",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      setValue('icon_name', iconName);
      setValue('icon_url', undefined);
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };
  
  const handleRemoveIcon = () => {
    setIconPreview(null);
    setSelectedIconName(null);
    setValue('icon_url', undefined);
    setValue('icon_name', undefined);
  };

  const onSubmitWrapped = async (values: RuleFormValues) => {
    setLoading(true);
    try {
      const ruleToSave: Partial<Rule> = {
        ...values,
        id: ruleData?.id,
        icon_name: selectedIconName || undefined,
        icon_url: iconPreview || undefined,
      };
      await onSave(ruleToSave);
      await clearPersistedState();
    } catch (error) {
      logger.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: "Failed to save rule. Please try again.",
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

  const handleDeleteConfirmWrapped = () => {
    if (onDelete && ruleData?.id) {
      onDelete(ruleData.id);
      clearPersistedState();
    }
    setIsDeleteDialogOpen(false);
  };

  const incrementPoints = () => {
    setValue('points_deducted', (watch('points_deducted') || 0) + 1);
  };

  const decrementPoints = () => {
    const currentPoints = watch('points_deducted') || 0;
    if (currentPoints > 0) {
      setValue('points_deducted', currentPoints - 1);
    }
  };
  
  const incrementDomPoints = () => {
    setValue('dom_points_deducted', (watch('dom_points_deducted') || 0) + 1);
  };

  const decrementDomPoints = () => {
    const currentDomPoints = watch('dom_points_deducted') || 0;
    if (currentDomPoints > 0) {
      setValue('dom_points_deducted', currentDomPoints - 1);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmitWrapped)} className="space-y-6">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Rule Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Rule title (e.g., No swearing)"
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
                  placeholder="Detailed description of the rule" 
                  className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            control={control}
            name="points_deducted"
            label="Points Deducted (Sub)"
            onIncrement={incrementPoints}
            onDecrement={decrementPoints}
            minValue={0}
          />
          <NumberField
            control={control}
            name="dom_points_deducted"
            label="Points Deducted (Dom)"
            onIncrement={incrementDomPoints}
            onDecrement={decrementDomPoints}
            minValue={0}
          />
        </div>
        
        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Background Image</FormLabel>
          <BackgroundImageSelector
            control={control}
            imagePreview={imagePreview}
            initialPosition={{ 
              x: watch('focal_point_x') || 50, 
              y: watch('focal_point_y') || 50 
            }}
            onRemoveImage={handleRemoveImage}
            onImageUpload={handleImageUpload}
            setValue={setValue}
          />
        </div>

        <div className="space-y-4">
          <FormLabel className="text-white text-lg">Rule Icon</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
              <IconSelector
                selectedIconName={selectedIconName}
                iconPreview={iconPreview}
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
                <p className="text-sm text-white">Apply a yellow highlight behind title and description</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="pt-4 w-full flex items-center justify-end gap-3">
          {ruleData?.id && onDelete && (
            <DeleteRuleDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={handleDeleteConfirmWrapped}
              ruleName={ruleData?.title || 'this rule'}
            />
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancelWrapped}
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
