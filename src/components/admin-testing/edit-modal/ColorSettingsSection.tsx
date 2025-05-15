
import React from 'react';
import { Control } from 'react-hook-form';
import ColorPickerField from '@/components/task-editor/ColorPickerField';

interface ColorSettingsSectionProps {
  control: Control<any>;
}

const ColorSettingsSection: React.FC<ColorSettingsSectionProps> = ({ control }) => {
  return (
    <div className="space-y-4">
      <div className="text-white font-medium text-sm">Colors</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ColorPickerField 
          control={control}
          name="title_color"
          label="Title Color"
        />
        
        <ColorPickerField 
          control={control}
          name="subtext_color"
          label="Description Color"
        />
        
        <ColorPickerField 
          control={control}
          name="calendar_color"
          label="Calendar Color"
        />
        
        <ColorPickerField 
          control={control}
          name="icon_color"
          label="Icon Color"
        />
      </div>
    </div>
  );
};

export default ColorSettingsSection;
