
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
    // Create references for syncing
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const previewRef = React.useRef<HTMLDivElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    
    // Manually handle cursor positioning
    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
      if (textareaRef.current) {
        // First focus the textarea
        textareaRef.current.focus();

        // Let the native behavior handle the cursor position
        // This is critical for proper cursor positioning
      }
    }, []);
    
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
          ref={containerRef}
          className={cn(
            "flex min-h-[500px] w-full rounded-md border border-input bg-background text-sm relative",
            className
          )}
          onMouseDown={handleMouseDown}
        >
          {/* The actual textarea for editing - MUST match preview dimensions & position exactly */}
          <textarea
            ref={setRefs}
            className="absolute inset-0 w-full h-full resize-none outline-none selection:bg-blue-500/30"
            style={{
              caretColor: 'white',
              color: 'transparent',
              backgroundColor: 'transparent',
              zIndex: 2,
              padding: '0.5rem 0.75rem', // CRITICAL: match padding exactly with preview
            }}
            onScroll={syncScroll}
            onSelect={handleSelect}
            {...props}
          />
          
          {/* Formatted preview that shows the text - MUST match textarea dimensions & position exactly */}
          <div 
            ref={previewRef}
            style={{
              ...textStyle,
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              padding: '0.5rem 0.75rem', // CRITICAL: match padding exactly with textarea
              overflow: 'auto',
              lineHeight: '1.5', // Ensure consistent line height
              fontFamily: 'inherit', // Ensure consistent font
            }} 
            className="text-white"
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
