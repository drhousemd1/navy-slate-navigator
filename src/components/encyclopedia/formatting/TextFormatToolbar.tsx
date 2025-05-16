
import React from 'react';
import { Bold, Underline, Italic } from 'lucide-react'; // Italic not used yet but keep for consistency
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface TextFormatToolbarProps {
  // selectedTextRange and currentFormatting are simplified/removed as EditableGuide handles this differently
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onToggleItalic?: () => void; // Keep if planning to add
  onFontSizeChange: (value: string) => void;
  
  // Props kept for compatibility with how it's used elsewhere or for future states
  selectedTextRange: { start: number; end: number } | null; 
  currentFormatting: {
    isBold?: boolean;
    isUnderlined?: boolean;
    isItalic?: boolean;
    fontSize?: string;
  };
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  onToggleBold,
  onToggleUnderline,
  onToggleItalic,
  onFontSizeChange,
  selectedTextRange, // Kept for styling indicator, though not used for logic in new EditableGuide
  currentFormatting // Kept for styling indicator
}) => {
  // The logic for isTextSelected and button styling might need to adapt
  // if execCommand state is to be reflected (e.g. queryCommandState('bold'))
  // For now, it shows selection mode based on prop.
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
                // Styling based on currentFormatting.isBold could be replaced by queryCommandState if needed
                className={`${currentFormatting.isBold ? "bg-nav-active" : "hover:bg-light-navy"}`}
                onClick={onToggleBold}
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle bold</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="underline" 
                aria-label="Toggle underline"
                className={`${currentFormatting.isUnderlined ? "bg-nav-active" : "hover:bg-light-navy"}`}
                onClick={onToggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle underline</p>
            </TooltipContent>
          </Tooltip>
          
          {onToggleItalic && ( // Assuming Italic might be added later
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="italic" 
                  aria-label="Toggle italic"
                  className={`${currentFormatting.isItalic ? "bg-nav-active" : "hover:bg-light-navy"}`}
                  onClick={onToggleItalic}
                >
                  <Italic className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle italic</p>
              </TooltipContent>
            </Tooltip>
          )}
        </ToggleGroup>
      </TooltipProvider>
      
      <Select
        // Font size selection could also reflect current selection's font size if queried
        value={currentFormatting.fontSize || '1rem'} 
        onValueChange={onFontSizeChange}
      >
        <SelectTrigger className="w-32 bg-dark-navy border-light-navy text-white hover:bg-light-navy">
          <SelectValue placeholder="Font size" />
        </SelectTrigger>
        <SelectContent className="bg-dark-navy border-light-navy text-white">
          <SelectItem value="0.875rem">Small</SelectItem>
          <SelectItem value="1rem">Medium</SelectItem>
          <SelectItem value="1.25rem">Large</SelectItem>
          <SelectItem value="1.5rem">X-Large</SelectItem>
        </SelectContent>
      </Select>
      
      {isTextSelected && ( // This visual cue is still useful
        <div className="ml-2 px-2 py-1 bg-blue-600/20 rounded text-sm text-white">
          Formatting will apply to selected text
        </div>
      )}
    </div>
  );
};

export default TextFormatToolbar;
