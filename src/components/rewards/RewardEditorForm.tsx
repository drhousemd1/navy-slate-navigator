
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { logger } from '@/lib/logger';

// Define form schema
const rewardFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cost: z.number().min(0, "Cost must be 0 or greater"),
  supply: z.number().nullable(),
  is_dom_reward: z.boolean().default(false),
  icon_name: z.string().nullable(),
  icon_color: z.string(),
  title_color: z.string(),
  subtext_color: z.string(),
  calendar_color: z.string(),
  highlight_effect: z.boolean().default(false),
  background_opacity: z.number().min(0).max(100),
  focal_point_x: z.number().min(0).max(100),
  focal_point_y: z.number().min(0).max(100),
});

type RewardFormValues = z.infer<typeof rewardFormSchema>;

interface RewardEditorFormProps {
  rewardData: any;
  isDomRewardInitial?: boolean;
  onSave: (formData: any) => Promise<any>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isCreatingNew?: boolean;
}

const RewardEditorForm: React.FC<RewardEditorFormProps> = ({
  rewardData,
  isDomRewardInitial = false,
  onSave,
  onCancel,
  onDelete,
  isCreatingNew = true
}) => {
  const [isSaving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      title: '',
      description: '',
      cost: 10,
      supply: null,
      is_dom_reward: isDomRewardInitial,
      icon_name: null,
      icon_color: '#9b87f5',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      background_opacity: 100,
      focal_point_x: 50,
      focal_point_y: 50,
    }
  });

  // Update form when rewardData changes
  useEffect(() => {
    if (rewardData) {
      form.reset({
        title: rewardData.title || '',
        description: rewardData.description || '',
        cost: rewardData.cost ?? 10,
        supply: rewardData.supply,
        is_dom_reward: rewardData.is_dom_reward ?? isDomRewardInitial,
        icon_name: rewardData.icon_name || null,
        icon_color: rewardData.icon_color || '#9b87f5',
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        highlight_effect: rewardData.highlight_effect || false,
        background_opacity: rewardData.background_opacity ?? 100,
        focal_point_x: rewardData.focal_point_x ?? 50,
        focal_point_y: rewardData.focal_point_y ?? 50,
      });
    }
  }, [rewardData, form, isDomRewardInitial]);

  const onSubmit = async (data: RewardFormValues) => {
    try {
      setSaving(true);
      await onSave(data);
      setSaving(false);
    } catch (error) {
      logger.error("Error saving reward:", error);
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && rewardData?.id) {
      onDelete(rewardData.id);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Enter reward title"
              />
              {form.formState.errors.title && (
                <p className="text-destructive text-sm mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Enter reward description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="cost">Cost (Points)</Label>
              <Input
                id="cost"
                type="number"
                {...form.register("cost", { valueAsNumber: true })}
              />
              {form.formState.errors.cost && (
                <p className="text-destructive text-sm mt-1">{form.formState.errors.cost.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="supply">Supply (leave empty for unlimited)</Label>
              <Input
                id="supply"
                type="number"
                {...form.register("supply", { valueAsNumber: true })}
                placeholder="Unlimited"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_dom_reward"
                checked={form.watch("is_dom_reward")}
                onCheckedChange={(checked) => form.setValue("is_dom_reward", checked)}
              />
              <Label htmlFor="is_dom_reward">Is DOM Reward</Label>
            </div>

            <div>
              <Label>Icon Color</Label>
              <ColorPicker
                color={form.watch("icon_color")}
                onChange={(color) => form.setValue("icon_color", color)}
                suggestions={['#9b87f5', '#FF6347', '#1E90FF', '#32CD32', '#FFD700']}
              />
            </div>

            <div>
              <Label>Title Color</Label>
              <ColorPicker
                color={form.watch("title_color")}
                onChange={(color) => form.setValue("title_color", color)}
                suggestions={['#FFFFFF', '#FFD700', '#FF6347', '#ADD8E6', '#90EE90']}
              />
            </div>

            <div>
              <Label>Subtext Color</Label>
              <ColorPicker
                color={form.watch("subtext_color")}
                onChange={(color) => form.setValue("subtext_color", color)}
                suggestions={['#8E9196', '#CCCCCC', '#A9A9A9', '#B0C4DE', '#98FB98']}
              />
            </div>

            <div>
              <Label>Calendar Color</Label>
              <ColorPicker
                color={form.watch("calendar_color")}
                onChange={(color) => form.setValue("calendar_color", color)}
                suggestions={['#7E69AB', '#5D8AA8', '#800080', '#006400', '#8B0000']}
              />
            </div>

            <div>
              <Label>Background Opacity: {form.watch("background_opacity")}%</Label>
              <Slider
                value={[form.watch("background_opacity")]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => form.setValue("background_opacity", value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Focal Point X: {form.watch("focal_point_x")}%</Label>
                <Slider
                  value={[form.watch("focal_point_x")]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => form.setValue("focal_point_x", value)}
                />
              </div>
              <div>
                <Label>Focal Point Y: {form.watch("focal_point_y")}%</Label>
                <Slider
                  value={[form.watch("focal_point_y")]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => form.setValue("focal_point_y", value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="highlight_effect"
                checked={form.watch("highlight_effect")}
                onCheckedChange={(checked) => 
                  form.setValue("highlight_effect", checked === true)
                }
              />
              <Label htmlFor="highlight_effect">Enable Highlight Effect</Label>
            </div>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <div className="flex space-x-2">
              {!isCreatingNew && onDelete && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              )}
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reward 
              "{rewardData?.title || 'this reward'}" and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RewardEditorForm;
