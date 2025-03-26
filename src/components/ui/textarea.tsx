
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

    // Generate HTML content with formatted sections
    const renderFormattedContent = React.useCallback(() => {
      const text = props.value?.toString() || '';
      if (!text) return null;

      // If no formatted sections, just render the text
      if (!formattedSections || formattedSections.length === 0) {
        return text.split('\n').map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line || '\u00A0'}</div>
        ));
      }

      // Sort sections by start position to process from beginning to end
      const sortedSections = [...formattedSections].sort((a, b) => a.start - b.start);
      
      // Convert text to paragraphs with formatted sections
      const lines = text.split('\n');
      let charCounter = 0;
      
      return lines.map((line, lineIndex) => {
        const lineStart = charCounter;
        const lineLength = line.length;
        const lineEnd = lineStart + lineLength;
        charCounter += lineLength + 1; // +1 for the newline character
        
        // Find sections that overlap with this line
        const relevantSections = sortedSections.filter(
          section => section.start < lineEnd && section.end > lineStart
        );
        
        if (relevantSections.length === 0) {
          // No formatting for this line
          return <div key={lineIndex} className="whitespace-pre-wrap">{line || '\u00A0'}</div>;
        }
        
        // Build segments with relevant formatting
        const segments: React.ReactNode[] = [];
        let lastPos = 0;
        
        relevantSections.forEach((section) => {
          const sectionStart = Math.max(0, section.start - lineStart);
          const sectionEnd = Math.min(lineLength, section.end - lineStart);
          
          if (sectionStart > lastPos) {
            // Add unformatted text before this section
            segments.push(
              <span key={`text-${lastPos}`}>
                {line.substring(lastPos, sectionStart)}
              </span>
            );
          }
          
          if (sectionStart < sectionEnd) {
            // Add formatted section
            segments.push(
              <span 
                key={`fmt-${sectionStart}`}
                className="formatted-section"
                style={{
                  fontWeight: section.formatting.isBold ? 'bold' : 'inherit',
                  textDecoration: section.formatting.isUnderlined ? 'underline' : 'inherit',
                  fontSize: section.formatting.fontSize || 'inherit',
                  backgroundColor: 'rgba(66, 153, 225, 0.15)',
                  padding: '0px 1px',
                  borderRadius: '2px',
                  borderBottom: '1px solid rgba(66, 153, 225, 0.4)'
                }}
              >
                {line.substring(sectionStart, sectionEnd)}
              </span>
            );
          }
          
          lastPos = Math.max(lastPos, sectionEnd);
        });
        
        // Add any remaining unformatted text
        if (lastPos < lineLength) {
          segments.push(
            <span key={`text-end-${lastPos}`}>
              {line.substring(lastPos)}
            </span>
          );
        }
        
        return (
          <div key={lineIndex} className="whitespace-pre-wrap">
            {segments.length > 0 ? segments : '\u00A0'}
          </div>
        );
      });
    }, [props.value, formattedSections]);

    if (formattedPreview) {
      // Default text style for the entire content
      const textStyle: React.CSSProperties = {
        fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
        textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
        fontSize: textFormatting?.fontSize || '1rem',
        lineHeight: '1.5',
        color: 'white'
      };

      return (
        <div 
          ref={containerRef}
          className={cn(
            "relative min-h-[500px] w-full rounded-md border border-input bg-transparent text-sm",
            className
          )}
        >
          {/* Invisible textarea for editing */}
          <textarea
            ref={setRefs}
            className="absolute inset-0 w-full h-full resize-none px-3 py-2 bg-transparent text-transparent caret-white focus:outline-none"
            style={{ 
              caretColor: 'white',
              zIndex: 1
            }}
            onScroll={syncScroll}
            onSelect={handleSelect}
            {...props}
          />
          
          {/* Visible formatted content */}
          <div 
            ref={previewRef}
            className="absolute inset-0 w-full h-full px-3 py-2 pointer-events-none overflow-auto"
            style={{
              ...textStyle,
              zIndex: 0
            }}
          >
            {renderFormattedContent()}
          </div>
        </div>
      );
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
