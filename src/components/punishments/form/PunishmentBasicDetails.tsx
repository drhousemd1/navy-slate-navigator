import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Control,
  useController,
  UseFormSetValue,
} from 'react-hook-form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { logger } from '@/lib/logger'; // Added logger

export const punishmentFormSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  points: z.number().min(1, {
    message: "Points must be at least 1.",
  }),
  dom_points: z.number().optional(),
  dom_supply: z.number().optional(),
  icon_color: z.string().optional(),
  title_color: z.string().optional(),
  subtext_color: z.string().optional(),
  calendar_color: z.string().optional(),
  highlight_effect: z.boolean().optional(),
  background_opacity: z.number().optional(),
  focal_point_x: z.number().optional(),
  focal_point_y: z.number().optional(),
  is_permanent: z.boolean().optional(),
  is_sound_enabled: z.boolean().optional(),
  sound_file_url: z.string().optional(),
});

export type PunishmentFormValues = z.infer<typeof punishmentFormSchema>;

interface PunishmentBasicDetailsProps {
  control: Control<PunishmentFormValues>;
  setValue: UseFormSetValue<PunishmentFormValues>;
}

// Predefined color suggestions
const colorSuggestions = {
  title_color: ['#FFFFFF', '#FFD700', '#FF6347', '#ADD8E6', '#90EE90'],
  subtext_color: ['#CCCCCC', '#A9A9A9', '#B0C4DE', '#98FB98', '#FFE4B5'],
  icon_color: ['#FFFFFF', '#FFD700', '#FF4500', '#1E90FF', '#32CD32'],
};

const PunishmentBasicDetails: React.FC<PunishmentBasicDetailsProps> = ({ control, setValue }) => {
  const { field: titleField } = useController({ name: 'title', control });
  const { field: descriptionField } = useController({ name: 'description', control });
  const { field: pointsField } = useController({ name: 'points', control });

  const { field: titleColorField } = useController({ name: 'title_color', control });
  const { field: subtextColorField } = useController({ name: 'subtext_color', control });
  const { field: iconColorField } = useController({ name: 'icon_color', control });

  const { field: backgroundOpacityField } = useController({ name: 'background_opacity', control });
  const { field: focalPointXField } = useController({ name: 'focal_point_x', control });
  const { field: focalPointYField } = useController({ name: 'focal_point_y', control });
  const { field: highlightEffectField } = useController({ name: 'highlight_effect', control });
  const { field: isPermanentField } = useController({ name: 'is_permanent', control });
  const { field: isSoundEnabledField } = useController({ name: 'is_sound_enabled', control });
  
  const handleColorChange = (fieldName: keyof PunishmentFormValues, color: string) => {
    setValue(fieldName, color, { shouldValidate: true, shouldDirty: true });
    logger.debug(`Setting ${fieldName}:`, color);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
        <div>
          <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">Punishment Title</Label>
          <Input 
            id="title" 
            {...titleField} 
            placeholder="e.g., No Sweets for a Day" 
            className="mt-1 bg-input text-foreground border-border focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">Description (Optional)</Label>
          <Textarea 
            id="description" 
            {...descriptionField}
            value={descriptionField.value || ''} // Ensure value is not null
            placeholder="e.g., A penalty for not completing daily chores."
            className="mt-1 bg-input text-foreground border-border focus:ring-primary focus:border-primary"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="points" className="text-sm font-medium text-muted-foreground">Points Deducted</Label>
          <Input 
            id="points" 
            type="number"
            {...pointsField}
            value={pointsField.value || 0} // Ensure value is not null
            onChange={(e) => pointsField.onChange(parseInt(e.target.value, 10) || 0)}
            placeholder="e.g., 50"
            className="mt-1 bg-input text-foreground border-border focus:ring-primary focus:border-primary"
          />
        </div>
         <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="is_permanent"
            checked={isPermanentField.value}
            onCheckedChange={isPermanentField.onChange}
          />
          <Label htmlFor="is_permanent" className="text-sm font-medium text-muted-foreground">
            Permanent Punishment (cannot be undone/repurchased)
          </Label>
        </div>
      </div>

      {/* Appearance Settings Section */}
      <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
        <h3 className="text-lg font-semibold text-foreground">Appearance Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="title_color" className="text-sm font-medium text-muted-foreground">Title Color</Label>
            <ColorPicker 
              color={titleColorField.value || '#FFFFFF'} 
              onChange={(color) => handleColorChange('title_color', color)}
              suggestions={colorSuggestions.title_color}
            />
            {logger.debug("colorSuggestions for title_color:", colorSuggestions.title_color)}
          </div>
          <div>
            <Label htmlFor="subtext_color" className="text-sm font-medium text-muted-foreground">Subtext Color</Label>
            <ColorPicker 
              color={subtextColorField.value || '#CCCCCC'} 
              onChange={(color) => handleColorChange('subtext_color', color)}
              suggestions={colorSuggestions.subtext_color}
            />
             {logger.debug("colorSuggestions for subtext_color:", colorSuggestions.subtext_color)}
          </div>
          <div>
            <Label htmlFor="icon_color" className="text-sm font-medium text-muted-foreground">Icon Color</Label>
            <ColorPicker 
              color={iconColorField.value || '#FFFFFF'} 
              onChange={(color) => handleColorChange('icon_color', color)}
              suggestions={colorSuggestions.icon_color}
            />
             {logger.debug("colorSuggestions for icon_color:", colorSuggestions.icon_color)}
          </div>
        </div>

        <div>
          <Label htmlFor="background_opacity" className="text-sm font-medium text-muted-foreground">
            Background Opacity ({backgroundOpacityField.value}%)
          </Label>
          <Slider
            id="background_opacity"
            min={0} max={100} step={1}
            value={[backgroundOpacityField.value || 100]}
            onValueChange={([val]) => {
              setValue('background_opacity', val, { shouldValidate: true, shouldDirty: true });
              logger.debug('Setting background_opacity:', val);
            }}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="focal_point_x" className="text-sm font-medium text-muted-foreground">
              Background Focal X ({focalPointXField.value}%)
            </Label>
            <Slider
              id="focal_point_x"
              min={0} max={100} step={1}
              value={[focalPointXField.value || 50]}
              onValueChange={([val]) => {
                setValue('focal_point_x', val, { shouldValidate: true, shouldDirty: true });
                logger.debug('Setting focal_point_x:', val);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="focal_point_y" className="text-sm font-medium text-muted-foreground">
              Background Focal Y ({focalPointYField.value}%)
            </Label>
            <Slider
              id="focal_point_y"
              min={0} max={100} step={1}
              value={[focalPointYField.value || 50]}
              onValueChange={([val]) => {
                setValue('focal_point_y', val, { shouldValidate: true, shouldDirty: true });
                logger.debug('Setting focal_point_y:', val);
              }}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="highlight_effect"
            checked={highlightEffectField.value}
            onCheckedChange={highlightEffectField.onChange}
          />
          <Label htmlFor="highlight_effect" className="text-sm font-medium text-muted-foreground">
            Enable Hover Highlight Effect
          </Label>
        </div>
      </div>
      
      {/* Sound Settings Section */}
      <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
        <h3 className="text-lg font-semibold text-foreground">Sound Settings</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_sound_enabled"
            checked={isSoundEnabledField.value}
            onCheckedChange={isSoundEnabledField.onChange}
          />
          <Label htmlFor="is_sound_enabled" className="text-sm font-medium text-muted-foreground">
            Enable Sound on Apply
          </Label>
        </div>
        {isSoundEnabledField.value && (
          <div>
            <Label htmlFor="sound_file_url" className="text-sm font-medium text-muted-foreground">Sound File URL (Optional)</Label>
            <Controller
              name="sound_file_url"
              control={control}
              render={({ field }) => (
                <Input 
                  id="sound_file_url" 
                  {...field} 
                  value={field.value || ''}
                  placeholder="https://example.com/sound.mp3" 
                  className="mt-1 bg-input text-foreground border-border focus:ring-primary focus:border-primary"
                />
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">If left blank, a default sound may be used.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PunishmentBasicDetails;
