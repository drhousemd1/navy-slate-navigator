
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
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const previewRef = React.useRef<HTMLDivElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

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

    // Synchronize scroll position between preview and textarea
    const syncScroll = React.useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
      if (previewRef.current) {
        previewRef.current.scrollTop = e.currentTarget.scrollTop;
      }
    }, []);

    // Handle text selection in the textarea
    const handleSelect = React.useCallback(() => {
      if (textareaRef.current && onFormatSelection) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start !== end) {
          onFormatSelection({ start, end });
        }
      }
    }, [onFormatSelection]);

    // Generate formatted HTML preview with section-specific formatting
    const generateFormattedHTML = React.useCallback(() => {
      const text = props.value?.toString() || '';
      
      if (!formattedSections || formattedSections.length === 0) {
        // If no formatted sections, return an empty string to prevent duplicating text
        // The actual text is already visible in the textarea
        return '';
      }

      // Sort sections by start position to process in order
      const sortedSections = [...formattedSections].sort((a, b) => a.start - b.start);
      
      // Create an array of objects representing each character and its formatting
      const characters: Array<{
        char: string;
        formatting: {
          isBold?: boolean;
          isUnderlined?: boolean;
          fontSize?: string;
        } | null;
      }> = text.split('').map(() => ({ char: '', formatting: null }));
      
      // Apply formatting information to each character
      for (const section of sortedSections) {
        for (let i = section.start; i < section.end && i < characters.length; i++) {
          characters[i].formatting = section.formatting;
        }
      }
      
      // Build the HTML with only the formatted sections visible
      let html = '';
      let currentFormatting = null;
      let currentSpan = '';
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const formatting = characters[i].formatting;
        
        // If this character has formatting
        if (formatting) {
          // If we're starting a new formatted section or changing formatting
          if (!currentFormatting || 
              currentFormatting.isBold !== formatting.isBold || 
              currentFormatting.isUnderlined !== formatting.isUnderlined || 
              currentFormatting.fontSize !== formatting.fontSize) {
            
            // Close previous span if there was one
            if (currentSpan) {
              html += currentSpan;
              currentSpan = '';
            }
            
            // Start a new formatted span
            currentFormatting = formatting;
            
            // Create CSS for this span
            const style = `
              position: absolute; 
              left: 0; 
              top: 0; 
              pointer-events: none;
              padding: 0;
              margin: 0;
              font-weight: ${formatting.isBold ? 'bold' : 'inherit'};
              text-decoration: ${formatting.isUnderlined ? 'underline' : 'none'};
              font-size: ${formatting.fontSize || 'inherit'};
              white-space: pre-wrap;
              word-break: break-word;
              overflow-wrap: break-word;
              color: transparent;
              background-color: ${formatting.isBold ? 'rgba(66, 153, 225, 0.3)' : 'transparent'};
              border-bottom: ${formatting.isUnderlined ? '2px solid rgba(66, 153, 225, 0.5)' : 'none'};
            `;
            
            currentSpan = `<span style="${style}" data-start="${i}">`;
          }
          
          // Add the character to the current span
          currentSpan += char === '\n' ? '<br/>' : char;
        } else {
          // If we were in a formatted span but this character has no formatting
          if (currentFormatting) {
            currentSpan += '</span>';
            html += currentSpan;
            currentSpan = '';
            currentFormatting = null;
          }
        }
      }
      
      // Close the last span if there is one
      if (currentSpan) {
        currentSpan += '</span>';
        html += currentSpan;
      }
      
      return html;
    }, [props.value, formattedSections]);

    if (formattedPreview) {
      // Default text style for the entire content
      const textStyle: React.CSSProperties = {
        fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
        textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
        fontSize: textFormatting?.fontSize || '1rem',
      };

      return (
        <div 
          ref={containerRef}
          className={cn(
            "flex min-h-[500px] w-full rounded-md border border-input bg-background text-sm relative",
            className
          )}
        >
          <textarea
            ref={setRefs}
            className="absolute top-0 left-0 w-full h-full resize-none outline-none px-3 py-2 box-border selection:bg-blue-500/30"
            style={{
              color: 'white',
              backgroundColor: 'transparent',
              zIndex: 2,
              lineHeight: '1.5',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              overflowY: 'auto',
              caretColor: 'white',
            }}
            onScroll={syncScroll}
            onSelect={handleSelect}
            {...props}
          />
          
          <div 
            ref={previewRef}
            className="absolute top-0 left-0 w-full h-full px-3 py-2 text-white pointer-events-none box-border"
            style={{
              ...textStyle,
              zIndex: 1,
              lineHeight: '1.5',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              overflowY: 'auto',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            dangerouslySetInnerHTML={{ 
              __html: generateFormattedHTML() 
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
