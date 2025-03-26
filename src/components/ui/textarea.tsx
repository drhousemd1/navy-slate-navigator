
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
  ({ className, formattedPreview, textFormatting, onFormatSelection, formattedSections = [], ...props }, ref) => {
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

    // Handle click in the textarea area to position cursor correctly
    const handleClick = React.useCallback((e: React.MouseEvent) => {
      if (textareaRef.current) {
        // Force the native cursor positioning to work
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      }
    }, []);

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

    // Generate formatted HTML preview with section-specific formatting
    const generateFormattedHTML = React.useCallback(() => {
      const text = props.value?.toString() || '';
      
      if (!formattedSections || formattedSections.length === 0) {
        // If no formatted sections, just return the text with line breaks
        return text.replace(/\n/g, '<br/>');
      }

      // Sort sections by start position to process in order
      const sortedSections = [...formattedSections].sort((a, b) => a.start - b.start);
      
      let html = '';
      let lastIndex = 0;
      
      // Process each formatted section
      for (const section of sortedSections) {
        // Add unformatted text before this section
        if (section.start > lastIndex) {
          html += text.substring(lastIndex, section.start).replace(/\n/g, '<br/>');
        }
        
        // Get the section text
        const sectionText = text.substring(section.start, section.end).replace(/\n/g, '<br/>');
        
        // Apply formatting to this section
        const { isBold, isUnderlined, fontSize } = section.formatting;
        let formattedText = sectionText;
        
        // Wrap in formatting tags as needed
        if (isBold) {
          formattedText = `<strong>${formattedText}</strong>`;
        }
        if (isUnderlined) {
          formattedText = `<u>${formattedText}</u>`;
        }
        if (fontSize) {
          formattedText = `<span style="font-size:${fontSize}">${formattedText}</span>`;
        }
        
        html += formattedText;
        lastIndex = section.end;
      }
      
      // Add any remaining text after the last formatted section
      if (lastIndex < text.length) {
        html += text.substring(lastIndex).replace(/\n/g, '<br/>');
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
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background text-sm relative",
            className
          )}
          onClick={handleClick}
        >
          {/* Visible textarea where user types */}
          <textarea
            ref={setRefs}
            className="w-full h-full min-h-[80px] px-3 py-2 bg-transparent resize-none outline-none caret-white selection:bg-blue-500/30"
            style={{
              color: 'transparent',
              caretColor: 'white',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2
            }}
            onScroll={syncScroll}
            onSelect={handleSelect}
            {...props}
          />
          
          {/* Formatted preview beneath textarea */}
          <div 
            ref={previewRef}
            style={{
              ...textStyle,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              padding: '0.5rem 0.75rem'
            }} 
            className="px-3 py-2 overflow-auto"
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
