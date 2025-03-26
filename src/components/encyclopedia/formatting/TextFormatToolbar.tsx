
import React from 'react';
import { Bold, Underline } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface TextFormatToolbarProps {
  selectedTextRange: { start: number; end: number } | null;
  currentFormatting: {
    isBold?: boolean;
    isUnderlined?: boolean;
    fontSize?: string;
  };
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onFontSizeChange: (value: string) => void;
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  selectedTextRange,
  currentFormatting,
  onToggleBold,
  onToggleUnderline,
  onFontSizeChange
}) => {
  return (
    <div className="bg-dark-navy border border-light-navy rounded-md p-2 mb-2 flex flex-wrap gap-2">
      <TooltipProvider>
        <ToggleGroup type="multiple" className="justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="bold" 
                aria-label="Toggle bold"
                className={selectedTextRange ? "bg-blue-600" : 
                  (currentFormatting.isBold ? "bg-nav-active" : "")}
                onClick={onToggleBold}
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>{selectedTextRange ? "Apply bold to selection" : "Toggle bold for all text"}</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="underline" 
                aria-label="Toggle underline"
                className={selectedTextRange ? "bg-blue-600" : 
                  (currentFormatting.isUnderlined ? "bg-nav-active" : "")}
                onClick={onToggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>{selectedTextRange ? "Apply underline to selection" : "Toggle underline for all text"}</p>
            </TooltipContent>
          </Tooltip>
        </ToggleGroup>
      </TooltipProvider>
      
      <Select
        value={currentFormatting.fontSize || '1rem'}
        onValueChange={onFontSizeChange}
      >
        <SelectTrigger className="w-32 bg-dark-navy border-light-navy text-white">
          <SelectValue placeholder="Font size" />
        </SelectTrigger>
        <SelectContent className="bg-dark-navy border-light-navy text-white">
          <SelectItem value="0.875rem">Small</SelectItem>
          <SelectItem value="1rem">Medium</SelectItem>
          <SelectItem value="1.25rem">Large</SelectItem>
          <SelectItem value="1.5rem">X-Large</SelectItem>
        </SelectContent>
      </Select>
      
      {selectedTextRange && (
        <div className="ml-2 px-2 py-1 bg-blue-600/20 rounded text-sm text-white">
          Text selected: Apply formatting to selection
        </div>
      )}
    </div>
  );
};

export default TextFormatToolbar;
