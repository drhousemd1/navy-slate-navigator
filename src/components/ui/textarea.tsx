
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
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, formattedPreview, textFormatting, onFormatSelection, ...props }, ref) => {
    // Create a reference for syncing scroll position
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const previewRef = React.useRef<HTMLDivElement | null>(null);
    
    // Handle scroll synchronization between preview and textarea
    const syncScroll = React.useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
      if (previewRef.current) {
        previewRef.current.scrollTop = e.currentTarget.scrollTop;
      }
    }, []);

    // Handle selection in the textarea
    const handleSelect = React.useCallback(() => {
      if (textareaRef.current && onFormatSelection) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        
        // Only trigger if there's an actual selection
        if (start !== end) {
          onFormatSelection({ start, end });
        }
      }
    }, [onFormatSelection]);

    // Set the ref to our local ref or the forwarded ref
    const setRefs = React.useCallback(
      (element: HTMLTextAreaElement | null) => {
        // Set local ref
        textareaRef.current = element;
        // Forward ref if provided
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    if (formattedPreview) {
      const textStyle: React.CSSProperties = {
        fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
        textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
        fontSize: textFormatting?.fontSize || '1rem',
      };

      return (
        <div className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background text-sm relative",
          className
        )}>
          {/* Visible textarea where user types */}
          <textarea
            ref={setRefs}
            className="w-full h-full min-h-[80px] px-3 py-2 bg-transparent resize-none outline-none text-transparent caret-white selection:bg-blue-500/30"
            style={{
              ...textStyle,
              WebkitTextFillColor: 'transparent'
            }}
            onScroll={syncScroll}
            onSelect={handleSelect}
            {...props}
          />
          
          {/* Formatted preview beneath textarea */}
          <div 
            ref={previewRef}
            style={textStyle} 
            className="absolute top-0 left-0 w-full h-full min-h-[80px] px-3 py-2 pointer-events-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ 
              __html: (props.value?.toString() || '').replace(/\n/g, '<br/>') 
            }} 
          />
        </div>
      )
    }

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
)
Textarea.displayName = "Textarea"

export { Textarea }
