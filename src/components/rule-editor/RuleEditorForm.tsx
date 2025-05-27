
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Rule, RuleFrequency } from '@/data/rules/types'; // Ensure correct path
import BasicDetailsSection from './BasicDetailsSection';
import IconSection from '@/components/task-editor/IconSelector'; // Reusing task icon selector components
import PredefinedIconsGrid from '@/components/task-editor/PredefinedIconsGrid'; // Reusing
import ColorSchemeSection from './ColorSchemeSection';
import BackgroundImageSection from '@/components/task-editor/BackgroundImageSelector'; // Reusing
import FrequencySection from './FrequencySection'; // Custom for rules if needed, or reuse task's
import { useTaskFormImageHandling } from '@/components/task-editor/hooks/useTaskFormImageHandling'; // Reusing
import { useTaskFormIconHandling } from '@/components/task-editor/hooks/useTaskFormIconHandling';   // Reusing
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2, Save } from 'lucide-react';
import DeleteRuleDialog from './DeleteRuleDialog'; // Create this component
import TaskIcon from '@/components/task/TaskIcon'; // For rendering icons
import { logger } from '@/lib/logger';


// Schema definition for Rule Form
const ruleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.coerce.number().min(1, "Priority must be at least 1").max(5, "Priority cannot exceed 5").optional().default(3),
  
  icon_color: z.string().optional().default('#FFD700'), // Gold as default for rules
  title_color: z.string().optional().default('#FFFFFF'),
  subtext_color: z.string().optional().default('#B0B0B0'), // Lighter gray for rules
  calendar_color: z.string().optional().default('#FFD700'), 
  highlight_effect: z.boolean().optional().default(true), // Highlight rules by default

  background_opacity: z.coerce.number().min(0).max(100).optional().default(30), // Less opaque default
  focal_point_x: z.coerce.number().min(0).max(100).optional().default(50),
  focal_point_y: z.coerce.number().min(0).max(100).optional().default(50),
  
  frequency: z.nativeEnum(RuleFrequency).default(RuleFrequency.Persistent), // Default for rules
  frequency_count: z.coerce.number().min(1, "Count must be at least 1").optional().default(1),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface RuleEditorFormProps {
  rule?: Rule;
  onSave: (data: RuleFormValues, icon_name: string | null, icon_url: string | null, background_image_url: string | null) => Promise<Rule | null | void>;
  onDelete?: (ruleId: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({ rule, onSave, onDelete, onCancel, isLoading: isExternallyLoading = false }) => {
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      title: rule?.title || '',
      description: rule?.description || '',
      priority: rule?.priority || 3,
      icon_color: rule?.icon_color || '#FFD700',
      title_color: rule?.title_color || '#FFFFFF',
      subtext_color: rule?.subtext_color || '#B0B0B0',
      calendar_color: rule?.calendar_color || '#FFD700',
      highlight_effect: rule?.highlight_effect === undefined ? true : rule.highlight_effect,
      background_opacity: rule?.background_opacity || 30,
      focal_point_x: rule?.focal_point_x || 50,
      focal_point_y: rule?.focal_point_y || 50,
      frequency: rule?.frequency || RuleFrequency.Persistent,
      frequency_count: rule?.frequency_count || 1,
    },
  });

  const formId = `rule-editor-${rule?.id || 'new'}`;
  const { clearPersistedState } = useFormStatePersister(formId, form, { exclude: [] });

  const { imagePreview, handleImageUpload, handleRemoveImage, setImagePreview, initialPosition } = useTaskFormImageHandling(
    rule?.background_image_url,
    { x: rule?.focal_point_x || 50, y: rule?.focal_point_y || 50 }
  );
  
  const { selectedIconName, iconPreview, iconColor, handleSelectIcon, handleUploadIcon, handleRemoveIcon, setSelectedIconName, setIconPreview } = useTaskFormIconHandling(
    rule?.icon_name,
    rule?.icon_url,
    form.watch('icon_color') || '#FFD700'
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsSaving(isExternallyLoading);
  }, [isExternallyLoading]);

  useEffect(() => {
    if (rule?.background_image_url) setImagePreview(rule.background_image_url);
    if (rule?.icon_name) setSelectedIconName(rule.icon_name);
    if (rule?.icon_url) setIconPreview(rule.icon_url);
    form.reset({
      title: rule?.title || '',
      description: rule?.description || '',
      priority: rule?.priority || 3,
      icon_color: rule?.icon_color || '#FFD700',
      title_color: rule?.title_color || '#FFFFFF',
      subtext_color: rule?.subtext_color || '#B0B0B0',
      calendar_color: rule?.calendar_color || '#FFD700',
      highlight_effect: rule?.highlight_effect === undefined ? true : rule.highlight_effect,
      background_opacity: rule?.background_opacity || 30,
      focal_point_x: rule?.focal_point_x || 50,
      focal_point_y: rule?.focal_point_y || 50,
      frequency: rule?.frequency || RuleFrequency.Persistent,
      frequency_count: rule?.frequency_count || 1,
    });
  }, [rule, form, setImagePreview, setSelectedIconName, setIconPreview]);

  const onSubmit = async (data: RuleFormValues) => {
    if (isSaving) return;
    setIsSaving(true);
    logger.log('Rule form submitted with data:', data, 'Icon:', selectedIconName || iconPreview, 'BG:', imagePreview);
    try {
      await onSave(data, selectedIconName, iconPreview, imagePreview);
      // onSave should handle its own success toast.
      await clearPersistedState();
      // onCancel(); // Parent handles closing
    } catch (error) {
      logger.error('Error saving rule:', error);
      toast({ title: "Save Error", description: error instanceof Error ? error.message : "Could not save the rule.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (rule?.id && onDelete) {
      setIsSaving(true);
      try {
        await onDelete(rule.id);
        // onDelete should handle its own success toast.
        await clearPersistedState();
        // onCancel(); // Parent handles closing
      } catch (error) {
        logger.error('Error deleting rule:', error);
        toast({ title: "Delete Error", description: error instanceof Error ? error.message : "Could not delete the rule.", variant: "destructive" });
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
        
        {/* Icon Section for Rules */}
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-3">Icon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                    <IconSection // This is the IconSelector from task-editor
                        selectedIconName={selectedIconName}
                        iconPreview={iconPreview}
                        iconColor={iconColor} // This is form.watch('icon_color')
                        onSelectIcon={handleSelectIcon}
                        onUploadIcon={handleUploadIcon}
                        onRemoveIcon={handleRemoveIcon}
                        renderIcon={(iconName) => <TaskIcon icon_name={iconName} icon_color={iconColor} className="h-6 w-6" />}
                    />
                </div>
                <PredefinedIconsGrid // This is from task-editor
                    selectedIconName={selectedIconName}
                    iconColor={iconColor}
                    onSelectIcon={handleSelectIcon}
                />
            </div>
        </div>

        <hr className="border-border/50 my-6" />
        <ColorSchemeSection control={form.control} />
        <hr className="border-border/50 my-6" />
        
        {/* Background Image Section for Rules */}
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-3">Background Image</h3>
            <BackgroundImageSection // This is the BackgroundImageSelector from task-editor
                control={form.control}
                imagePreview={imagePreview}
                initialPosition={initialPosition}
                onRemoveImage={handleRemoveImage}
                onImageUpload={handleImageUpload}
                setValue={form.setValue} // Pass setValue for focal point updates
            />
        </div>
        
        <hr className="border-border/50 my-6" />
        <FrequencySection control={form.control} frequency={form.watch('frequency')} />

        <div className="flex flex-col space-y-4 mt-6 md:mt-8">
            <div className="flex items-center justify-end space-x-3 pt-4">
                {rule && onDelete && (
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
                    variant="outline"
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
                            {rule ? 'Save Changes' : 'Create Rule'}
                        </>
                    )}
                </Button>
            </div>
        </div>

        {rule && onDelete && (
          <DeleteRuleDialog // Create this similar to DeleteTaskDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDelete={handleDelete}
            ruleName={rule.title}
            isDeleting={isSaving}
          />
        )}
      </form>
    </Form>
  );
};

export default RuleEditorForm;
