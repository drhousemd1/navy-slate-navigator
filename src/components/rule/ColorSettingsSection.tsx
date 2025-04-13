
import React from "react";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface Rule {
  id: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
}

interface ColorSettingsSectionProps {
  card: Rule;
  handleChange: (field: keyof Rule, value: any) => void;
}

const ColorSettingsSection: React.FC<ColorSettingsSectionProps> = ({ card, handleChange }) => {
  return (
    <div className="space-y-4">
      <FormLabel>Colors</FormLabel>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="title_color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title Color</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-full border" 
                    style={{ backgroundColor: card.title_color }}
                  />
                  <Input 
                    type="color" 
                    defaultValue={card.title_color} 
                    onChange={(e) => handleChange('title_color', e.target.value)}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="subtext_color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtext Color</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-full border" 
                    style={{ backgroundColor: card.subtext_color }}
                  />
                  <Input 
                    type="color" 
                    defaultValue={card.subtext_color} 
                    onChange={(e) => handleChange('subtext_color', e.target.value)}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="calendar_color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calendar Color</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-full border" 
                    style={{ backgroundColor: card.calendar_color }}
                  />
                  <Input 
                    type="color" 
                    defaultValue={card.calendar_color} 
                    onChange={(e) => handleChange('calendar_color', e.target.value)}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="icon_color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon Color</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-full border" 
                    style={{ backgroundColor: card.icon_color }}
                  />
                  <Input 
                    type="color" 
                    defaultValue={card.icon_color} 
                    onChange={(e) => handleChange('icon_color', e.target.value)}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ColorSettingsSection;
