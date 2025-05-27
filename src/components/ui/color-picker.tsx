
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  suggestions?: string[];
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  suggestions = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(color);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="h-9 w-12 border border-input bg-background cursor-pointer"
        />
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              type="button"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-border" 
                  style={{ backgroundColor: color }}
                />
                <span>{color}</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2">
            <div className="grid grid-cols-5 gap-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className={cn(
                    "h-7 w-7 rounded-full border border-border flex items-center justify-center",
                    color === suggestion && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: suggestion }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  type="button"
                >
                  {color === suggestion && (
                    <Check className="h-4 w-4 text-background stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
