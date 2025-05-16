
import React from 'react';
import { 
  Bold, 
  Underline, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ListOrdered, 
  ListUnordered,
  Table
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface TextFormatToolbarProps {
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onToggleItalic?: () => void;
  onFontSizeChange: (value: string) => void;
  onAlignText?: (alignment: 'left' | 'center' | 'right') => void;
  onListFormat?: (listType: 'ordered' | 'unordered') => void;
  onInsertTable?: () => void;
  
  // Props for styling indicators
  selectedTextRange: { start: number; end: number } | null; 
  currentFormatting: {
    isBold?: boolean;
    isUnderlined?: boolean;
    isItalic?: boolean;
    fontSize?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  onToggleBold,
  onToggleUnderline,
  onToggleItalic,
  onFontSizeChange,
  onAlignText,
  onListFormat,
  onInsertTable,
  selectedTextRange,
  currentFormatting
}) => {
  const isTextSelected = selectedTextRange !== null; 

  return (
    <div className="bg-white border border-light-navy rounded-md p-2 mb-2 flex flex-wrap items-center gap-2">
      <TooltipProvider>
        <ToggleGroup type="multiple" className="justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="bold" 
                aria-label="Toggle bold"
                className={`${currentFormatting.isBold ? "bg-gray-200" : "hover:bg-gray-100"} text-black`}
                onClick={onToggleBold}
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bold</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="underline" 
                aria-label="Toggle underline"
                className={`${currentFormatting.isUnderlined ? "bg-gray-200" : "hover:bg-gray-100"} text-black`}
                onClick={onToggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>Underline</p>
            </TooltipContent>
          </Tooltip>
          
          {onToggleItalic && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="italic" 
                  aria-label="Toggle italic"
                  className={`${currentFormatting.isItalic ? "bg-gray-200" : "hover:bg-gray-100"} text-black`}
                  onClick={onToggleItalic}
                >
                  <Italic className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Italic</p>
              </TooltipContent>
            </Tooltip>
          )}
        </ToggleGroup>
      </TooltipProvider>
      
      <Separator orientation="vertical" className="h-6" />
      
      {onAlignText && (
        <TooltipProvider>
          <ToggleGroup type="single" value={currentFormatting.alignment || 'left'} className="justify-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="left" 
                  aria-label="Align left"
                  className="hover:bg-gray-100 text-black"
                  onClick={() => onAlignText('left')}
                >
                  <AlignLeft className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Align left</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="center" 
                  aria-label="Align center"
                  className="hover:bg-gray-100 text-black"
                  onClick={() => onAlignText('center')}
                >
                  <AlignCenter className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Align center</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="right" 
                  aria-label="Align right"
                  className="hover:bg-gray-100 text-black"
                  onClick={() => onAlignText('right')}
                >
                  <AlignRight className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Align right</p>
              </TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </TooltipProvider>
      )}
      
      <Separator orientation="vertical" className="h-6" />
      
      {onListFormat && (
        <TooltipProvider>
          <ToggleGroup type="multiple" className="justify-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="ordered-list" 
                  aria-label="Ordered list"
                  className="hover:bg-gray-100 text-black"
                  onClick={() => onListFormat('ordered')}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ordered list</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="unordered-list" 
                  aria-label="Unordered list"
                  className="hover:bg-gray-100 text-black"
                  onClick={() => onListFormat('unordered')}
                >
                  <ListUnordered className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Unordered list</p>
              </TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </TooltipProvider>
      )}
      
      {onInsertTable && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value="table" 
                  aria-label="Insert table"
                  className="hover:bg-gray-100 text-black"
                  onClick={onInsertTable}
                >
                  <Table className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Insert table</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      
      <Separator orientation="vertical" className="h-6" />
      
      <Select
        value={currentFormatting.fontSize || '1rem'} 
        onValueChange={onFontSizeChange}
      >
        <SelectTrigger className="w-32 bg-white border-gray-300 text-black hover:bg-gray-50">
          <SelectValue placeholder="Font size" />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-300 text-black">
          <SelectItem value="0.875rem">Small</SelectItem>
          <SelectItem value="1rem">Medium</SelectItem>
          <SelectItem value="1.25rem">Large</SelectItem>
          <SelectItem value="1.5rem">X-Large</SelectItem>
          <SelectItem value="2rem">XX-Large</SelectItem>
        </SelectContent>
      </Select>
      
      {isTextSelected && (
        <div className="ml-2 px-2 py-1 bg-blue-100 rounded text-sm text-blue-800">
          Formatting will apply to selected text
        </div>
      )}
    </div>
  );
};

export default TextFormatToolbar;
