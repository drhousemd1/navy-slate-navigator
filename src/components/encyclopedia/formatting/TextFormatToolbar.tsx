
import React from 'react';
import { Bold, Underline, Italic } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface TextFormatToolbarProps {
  selectedTextRange: { start: number; end: number } | null;
  currentFormatting: {
    isBold?: boolean;
    isUnderlined?: boolean;
    isItalic?: boolean;
    fontSize?: string;
  };
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onToggleItalic?: () => void;
  onFontSizeChange: (value: string) => void;
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  selectedTextRange,
  currentFormatting,
  onToggleBold,
  onToggleUnderline,
  onToggleItalic,
  onFontSizeChange
}) => {
  const isTextSelected = selectedTextRange !== null;

  return (
    <div className="bg-dark-navy border border-light-navy rounded-md p-2 mb-2 flex flex-wrap gap-2">
      <TooltipProvider>
        <ToggleGroup type="multiple" className="justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="bold" 
                aria-label="Toggle bold"
                className={`${isTextSelected ? "bg-blue-600 hover:bg-blue-700" : 
                  (currentFormatting.isBold ? "bg-nav-active" : "")}`}
                onClick={onToggleBold}
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isTextSelected ? "Apply bold to selection" : "Toggle bold for all text"}</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="underline" 
                aria-label="Toggle underline"
                className={`${isTextSelected ? "bg-blue-600 hover:bg-blue-700" : 
                  (currentFormatting.isUnderlined ? "bg-nav-active" : "")}`}
                onClick={onToggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isTextSelected ? "Apply underline to selection" : "Toggle underline for all text"}</p>
            </TooltipContent>
          </Tooltip>
          
          {onToggleItalic && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="italic" 
                  aria-label="Toggle italic"
                  className={`${isTextSelected ? "bg-blue-600 hover:bg-blue-700" : 
                    (currentFormatting.isItalic ? "bg-nav-active" : "")}`}
                  onClick={onToggleItalic}
                >
                  <Italic className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isTextSelected ? "Apply italic to selection" : "Toggle italic for all text"}</p>
              </TooltipContent>
            </Tooltip>
          )}
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
      
      {isTextSelected && (
        <div className="ml-2 px-2 py-1 bg-blue-600/20 rounded text-sm text-white">
          Selection mode: formatting will apply only to selected text
        </div>
      )}
    </div>
  );
};

export default TextFormatToolbar;
