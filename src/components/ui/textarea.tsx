import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  formattedPreview?: boolean;
  textFormatting?: {
    isBold?: boolean;
    isUnderlined?: boolean;
    fontSize?: string;
  };
  onFormatSelection?: (selection: { start: number; end: number }) => void;
  formattedSections?: Array<{
    start: number;
    end: number;
    formatting: {
      isBold?: boolean;
      isUnderlined?: boolean;
      fontSize?: string;
    }
  }>;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      formattedPreview,
      textFormatting,
      onFormatSelection,
      formattedSections = [],
      ...props
    },
    ref
  ) => {
    // If not using formatted preview, render the standard textarea
    if (!formattedPreview) {
      return (
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      )
    }
    
    // Use contentEditable div instead of textarea for better formatting control
    const editorRef = React.useRef<HTMLDivElement>(null);
    
    // Forward the ref to our component
    React.useImperativeHandle(ref, () => {
      // Create a mock textarea interface that the form expects
      return {
        value: props.value as string,
        focus: () => {
          if (editorRef.current) editorRef.current.focus();
        },
        blur: () => {
          if (editorRef.current) editorRef.current.blur();
        },
        // Other required properties
        name: props.name,
        form: null,
        // Empty implementations for methods
        select: () => {},
        setSelectionRange: () => {},
        setRangeText: () => {},
      } as unknown as HTMLTextAreaElement;
    });
    
    // Handle changes to the contentEditable div
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const content = e.currentTarget.innerText;
      
      // Call the onChange handler expected by React Hook Form
      if (props.onChange) {
        const event = {
          target: {
            name: props.name,
            value: content
          }
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        
        props.onChange(event);
      }
    };
    
    // Handle selection for formatting
    const handleSelect = () => {
      if (!editorRef.current || !onFormatSelection) return;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      if (!range) return;
      
      // Only handle selections within our editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) return;
      
      // Get the text content of the editor
      const text = editorRef.current.innerText;
      
      // If there's a real selection (not just cursor)
      if (range.startOffset !== range.endOffset) {
        console.log("Text selected:", {
          start: range.startOffset,
          end: range.endOffset
        });
        
        // Find the absolute offsets in the full text
        onFormatSelection({
          start: range.startOffset,
          end: range.endOffset
        });
      }
    };
    
    // Set initial content when value changes from outside
    React.useEffect(() => {
      if (editorRef.current && props.value) {
        if (editorRef.current.innerText !== props.value) {
          editorRef.current.innerText = props.value as string;
        }
      }
    }, [props.value]);
    
    // Handle focus event with proper typing
    const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
      if (props.onFocus) {
        // Create a synthetic event that matches what the form expects
        const syntheticEvent = {
          ...e,
          currentTarget: {
            ...e.currentTarget,
            value: e.currentTarget.innerText
          }
        } as unknown as React.FocusEvent<HTMLTextAreaElement>;
        
        props.onFocus(syntheticEvent);
      }
    };
    
    // Handle blur event with proper typing
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      if (props.onBlur) {
        // Create a synthetic event that matches what the form expects
        const syntheticEvent = {
          ...e,
          currentTarget: {
            ...e.currentTarget,
            value: e.currentTarget.innerText
          }
        } as unknown as React.FocusEvent<HTMLTextAreaElement>;
        
        props.onBlur(syntheticEvent);
      }
    };
    
    return (
      <div 
        className={cn(
          "flex w-full rounded-md border border-input bg-dark-navy px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-auto",
          className
        )}
        style={{
          minHeight: '200px',
          maxHeight: '400px'
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          className="w-full focus:outline-none whitespace-pre-wrap text-white"
          style={{
            lineHeight: '1.5',
            minHeight: '200px'
          }}
          onInput={handleInput}
          onSelect={handleSelect}
          suppressContentEditableWarning={true}
          data-placeholder={props.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
    );
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
