
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface Rule {
  id: string;
  highlight_effect?: boolean;
}

interface HighlightEffectToggleProps {
  card: Rule;
  handleChange: (field: keyof Rule, value: any) => void;
}

const HighlightEffectToggle: React.FC<HighlightEffectToggleProps> = ({ card, handleChange }) => {
  return (
    <FormField
      name="highlight_effect"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between">
          <div className="space-y-0.5">
            <FormLabel>Highlight Effect</FormLabel>
            <FormDescription>Apply a highlight effect to emphasize card content</FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={card.highlight_effect || false}
              onCheckedChange={(checked) => handleChange('highlight_effect', checked)}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default HighlightEffectToggle;
