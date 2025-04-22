import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Control } from 'react-hook-form';

// Define the RuleFormValues interface ( duplicated from RuleEditForm.tsx to avoid circular dependencies )
interface RuleFormValues {
    title: string;
    description: string;
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
    frequency: 'daily' | 'weekly';
    frequency_count: number;
}

interface InputFieldProps {
  name: keyof RuleFormValues;
  label: string;
  control: Control<RuleFormValues>;
  placeholder?: string;
  type?: string;
  rows?: number;
}

export const InputField: React.FC<InputFieldProps> = ({
  name, label, control, placeholder, type = "text", rows
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <FormControl>
            {type === "textarea" ? (
              <Textarea
                placeholder={placeholder}
                className="bg-dark-navy border-light-navy text-white min-h-[100px]"
                rows={rows}
                {...field}
              />
            ) : (
              <Input
                type={type}
                placeholder={placeholder}
                className="bg-dark-navy border-light-navy text-white"
                {...field}
              />
            )}
          </FormControl>
        </FormItem>
      )}
    />
  );
};

interface SwitchFieldProps {
  name: keyof RuleFormValues;
  label: string;
  control: Control<RuleFormValues>;
  description?: string;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  name, label, control, description
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <FormLabel className="text-white">{label}</FormLabel>
            {description && <p className="text-sm text-white">{description}</p>}
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
  );
};

// Re-export the components from TaskCardEditModal directory
export { ColorPickerField } from '../TaskCardEditModal/FormFields';
export { PrioritySelector } from '../TaskCardEditModal/FormFields';
export { BackgroundImageSelector } from '../TaskCardEditModal/FormFields';
export { IconSelector } from '../TaskCardEditModal/FormFields';
export { PredefinedIconsGrid } from '../TaskCardEditModal/FormFields';