
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

    // Generate formatted HTML preview
    const generateFormattedHTML = React.useCallback(() => {
      const text = props.value?.toString() || '';
      
      if (!formattedSections || formattedSections.length === 0) {
        return '';
      }

      let html = text;
      
      // Convert newlines to <br> for HTML rendering
      html = html.replace(/\n/g, '<br>');
      
      // Sort sections from end to start to avoid index shifting issues
      const sortedSections = [...formattedSections].sort((a, b) => b.start - a.start);
      
      // Apply formatting to each section
      for (const section of sortedSections) {
        const { start, end, formatting } = section;
        const { isBold, isUnderlined, fontSize } = formatting;
        
        if (start < 0 || end > html.length || start >= end) continue;
        
        // Extract the section content (after converting newlines)
        // We need to adjust for added <br> tags
        let adjustedStart = start;
        let adjustedEnd = end;
        
        // Count newlines before start position to adjust indices
        const beforeStart = text.substring(0, start);
        const newlineCountBeforeStart = (beforeStart.match(/\n/g) || []).length;
        adjustedStart += newlineCountBeforeStart * 3; // <br> adds 3 chars compared to \n
        
        // Count newlines before end position
        const beforeEnd = text.substring(0, end);
        const newlineCountBeforeEnd = (beforeEnd.match(/\n/g) || []).length;
        adjustedEnd += newlineCountBeforeEnd * 3;
        
        // Extract section with adjusted indices
        const beforeSection = html.substring(0, adjustedStart);
        const sectionContent = html.substring(adjustedStart, adjustedEnd);
        const afterSection = html.substring(adjustedEnd);
        
        // Apply styling as CSS classes instead of inline styles for cleaner code
        let formattedContent = `<span class="`;
        if (isBold) formattedContent += "formatted-bold ";
        if (isUnderlined) formattedContent += "formatted-underline ";
        formattedContent += `" ${fontSize ? `style="font-size:${fontSize};"` : ''}>${sectionContent}</span>`;
        
        html = beforeSection + formattedContent + afterSection;
      }
      
      return `<style>
        .formatted-bold { 
          font-weight: bold; 
          background-color: rgba(66, 153, 225, 0.2);
        }
        .formatted-underline { 
          text-decoration: underline; 
          border-bottom: 2px solid rgba(66, 153, 225, 0.4);
        }
      </style>${html}`;
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
          {/* Main textarea (user input) */}
          <textarea
            ref={setRefs}
            className="w-full h-full resize-none px-3 py-2 bg-transparent text-white focus:outline-none"
            style={{
              caretColor: 'white',
              position: 'relative',
              zIndex: 2,
            }}
            onScroll={syncScroll}
            onSelect={handleSelect}
            {...props}
          />
          
          {/* Formatted preview overlay */}
          <div 
            ref={previewRef}
            className="absolute top-0 left-0 w-full h-full px-3 py-2 pointer-events-none"
            style={{
              ...textStyle,
              zIndex: 1,
              overflow: 'hidden',
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
