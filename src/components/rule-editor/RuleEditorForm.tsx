import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { Rule } from '@/data/interfaces/Rule';
import ColorPickerField from '../task-editor/ColorPickerField';
import BackgroundImageSelector from '../task-editor/BackgroundImageSelector';
import IconSelector from '../task-editor/IconSelector';
import PredefinedIconsGrid from '../task-editor/PredefinedIconsGrid';
import PrioritySelector from '../task-editor/PrioritySelector';
import DeleteRuleDialog from './DeleteRuleDialog';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { readBackgroundDraft, captureDraftImageSession, chooseDraftIcon, reportDraftImageError, editorDraftKey, type EditorDraftScope } from '@/lib/editorDrafts';
import { useEditorDraftScope } from '@/hooks/useEditorDraftScope';
import { useFormStatePersister } from '@/hooks/useFormStatePersister';
import { EditorDraftNotice } from '@/components/common/EditorDraftNotice';

interface RuleFormValues {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
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
  // Opaque image metadata is passed through, not edited as recursive form fields.
  image_meta?: unknown;
}

interface RuleEditorFormProps {
  ruleData?: Rule;
  preserveHistory?: boolean;
  onSave: (ruleData: Partial<Rule>) => Promise<void>;
  onDelete?: (ruleId: string) => Promise<void>;
  onCancel: () => void;
}

const RuleEditorForm: React.FC<RuleEditorFormProps> = (props) => {
  const scope = useEditorDraftScope();
  if (!scope) return <p role="status">Checking your draft account…</p>;
  return <RuleEditorSession key={editorDraftKey(scope, `rule-editor-${props.ruleData?.id || 'new'}`)} {...props} scope={scope} />;
};

const RuleEditorSession: React.FC<RuleEditorFormProps & { scope: EditorDraftScope }> = ({ scope,
  ruleData, preserveHistory = false,
  onSave,
  onDelete,
  onCancel,
}) => {
  const text = useCoreTextClasses();
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<RuleFormValues>({
    shouldFocusError: false,
    defaultValues: {
      title: ruleData?.title ?? '',
      description: ruleData?.description ?? '',
      priority: ruleData?.priority ?? 'medium',
      background_image_url: ruleData?.background_image_url ?? undefined,
      background_opacity: ruleData?.background_opacity ?? 100,
      icon_url: ruleData?.icon_url ?? undefined,
      icon_name: ruleData?.icon_name ?? undefined,
      title_color: ruleData?.title_color ?? '#FFFFFF',
      subtext_color: ruleData?.subtext_color ?? '#8E9196',
      calendar_color: ruleData?.calendar_color ?? '#7E69AB',
      icon_color: ruleData?.icon_color ?? '#FF6B6B',
      highlight_effect: ruleData?.highlight_effect ?? false,
      focal_point_x: ruleData?.focal_point_x ?? 50,
      focal_point_y: ruleData?.focal_point_y ?? 50,
      image_meta: ruleData?.image_meta ?? null,
    },
  });

  const draft = useFormStatePersister(`rule-editor-${ruleData?.id || 'new'}`, form, { scope });
  const { setValue, control, handleSubmit: formHandleSubmit, getValues } = form;
  const imagePreview = form.watch('background_image_url') ?? null;
  const iconPreview = form.watch('icon_url') ?? null;
  const handleCancelWithClear = async () => { if (await draft.clearPersistedState()) onCancel(); };

  const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const applyImage = captureDraftImageSession(form);
    try {
      const { url, metadata } = await readBackgroundDraft(file);
      applyImage(() => {
        setValue('background_image_url', url, { shouldDirty: true });
        setValue('image_meta', metadata, { shouldDirty: true });
      });
    } catch { reportDraftImageError(); }
  };

  const handleIconUpload = () => {
    const applyImage = captureDraftImageSession(form);
    chooseDraftIcon(url => applyImage(() => {
      setValue('icon_url', url, { shouldDirty: true });
      setValue('icon_name', undefined, { shouldDirty: true });
    }));
  };

  const handleIconSelect = (iconName: string) => {
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setValue('icon_url', iconUrl);
      setValue('icon_name', undefined);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the rule",
      });
    } else {
      setValue('icon_name', iconName);
      setValue('icon_url', undefined); 
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };
  
  const handleRemoveIcon = () => {
    setValue('icon_url', undefined);
    setValue('icon_name', undefined);
    toast({ title: "Icon removed" });
  };

  const onSubmitWrapped = async (values: RuleFormValues) => {
    setLoading(true);
    try {
      const currentValues = getValues();
      const ruleToSave: Partial<Rule> = {
        ...values,
        id: ruleData?.id,
        priority: values.priority,
        background_image_url: imagePreview || values.background_image_url || null,
        image_meta: values.image_meta as Rule['image_meta'],
        icon_name: currentValues.icon_name || null,
        icon_url: iconPreview || null,
      };
      
      await onSave(ruleToSave);
      await draft.clearPersistedState();
      onCancel();
    } catch (error) {
      logger.error('[RuleEditorForm] Error saving rule:', error);
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWrapped = async () => {
    if (isDeleting) return;
    if (ruleData?.id && onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(ruleData.id);
        await draft.clearPersistedState();
        setIsDeleteDialogOpen(false);
        onCancel();
      } catch (error) {
        logger.error('[RuleEditorForm] Error deleting rule:', error);
        toast({ title: "Error", description: "Failed to delete rule. Please try again.", variant: "destructive" });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!draft.ready) return <p role="status">Loading your draft…</p>;
  return (
    <Form {...form}>
      <EditorDraftNotice draft={draft} />
      <form onSubmit={formHandleSubmit(onSubmitWrapped)} className="space-y-6">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={text.primary}>Rule Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Rule title (e.g., No swearing)"
                  className={`bg-dark-navy border-light-navy ${text.field}`}
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
              <FormLabel className={text.primary}>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detailed description of the rule" 
                  className={`bg-dark-navy border-light-navy ${text.field} min-h-[100px]`}
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <PrioritySelector control={control} name="priority" />
        
        <div className="space-y-4">
          <FormLabel className={`${text.primary} text-lg`}>Background Image</FormLabel>
          <BackgroundImageSelector
            control={control}
            imagePreview={imagePreview}
            initialPosition={{ 
              x: form.watch('focal_point_x') ?? 50,
              y: form.watch('focal_point_y') ?? 50
            }}
            onRemoveImage={() => {
              setValue('background_image_url', undefined);
              setValue('image_meta', null);
            }}
            onImageUpload={handleImageUploadWrapper}
            setValue={setValue}
          />
        </div>

        <div className="space-y-4">
          <FormLabel className={`${text.primary} text-lg`}>Rule Icon</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
              <IconSelector
                selectedIconName={form.watch('icon_name')}
                iconPreview={iconPreview}
                iconColor={form.watch('icon_color')}
                onSelectIcon={handleIconSelect}
                onUploadIcon={handleIconUpload}
                onRemoveIcon={handleRemoveIcon}
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
                <FormLabel className={text.primary}>Highlight Effect</FormLabel>
                <p className={`text-sm ${text.primary}`}>Apply a yellow highlight behind title and description</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="pt-4 w-full flex flex-wrap items-center justify-end gap-3">
          {ruleData?.id && onDelete && (
            <DeleteRuleDialog
              isDeleting={isDeleting}
              preserveHistory={preserveHistory}
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={handleDeleteWrapped}
              ruleName={ruleData?.title || 'this rule'}
            />
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancelWithClear}
            className="bg-red-700 border-light-navy text-white hover:bg-red-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className={`bg-nav-active ${text.primary} hover:bg-nav-active/90 flex items-center gap-2`}
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
