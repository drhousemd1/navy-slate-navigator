
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

      // Convert text to an array of lines
      const lines = text.split('\n');
      
      // Process each line separately
      return lines.map((line, lineIndex) => {
        // For empty lines, return a non-breaking space to maintain height
        if (!line) {
          return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">&nbsp;</div>;
        }
        
        // If no formatted sections, just return the line
        if (!formattedSections || formattedSections.length === 0) {
          return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">{line}</div>;
        }
        
        // Calculate character position
        let charPosition = 0;
        for (let i = 0; i < lineIndex; i++) {
          charPosition += lines[i].length + 1; // +1 for newline
        }
        
        // Find sections applicable to this line
        const lineSections = formattedSections.filter(section => {
          const sectionStart = section.start;
          const sectionEnd = section.end;
          const lineStart = charPosition;
          const lineEnd = lineStart + line.length;
          
          return sectionStart < lineEnd && sectionEnd > lineStart;
        });
        
        // If no sections apply to this line
        if (lineSections.length === 0) {
          return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">{line}</div>;
        }
        
        // Break line into segments based on formatting
        const segments: React.ReactNode[] = [];
        let currentPos = 0;
        
        // Sort sections by start position
        const sortedSections = [...lineSections].sort((a, b) => 
          (a.start - charPosition) - (b.start - charPosition)
        );
        
        // Create formatted segments
        sortedSections.forEach((section, i) => {
          const relativeStart = Math.max(0, section.start - charPosition);
          const relativeEnd = Math.min(line.length, section.end - charPosition);
          
          // Add unformatted text before this section if needed
          if (relativeStart > currentPos) {
            segments.push(
              <span key={`plain-${i}`}>
                {line.substring(currentPos, relativeStart)}
              </span>
            );
          }
          
          // Add the formatted section
          if (relativeStart < relativeEnd) {
            segments.push(
              <span 
                key={`fmt-${i}`}
                style={{
                  fontWeight: section.formatting.isBold ? 'bold' : 'inherit',
                  textDecoration: section.formatting.isUnderlined ? 'underline' : 'inherit',
                  fontSize: section.formatting.fontSize || 'inherit',
                  backgroundColor: 'rgba(66, 153, 225, 0.15)',
                  borderBottom: '1px solid rgba(66, 153, 225, 0.4)'
                }}
              >
                {line.substring(relativeStart, relativeEnd)}
              </span>
            );
          }
          
          // Update current position
          currentPos = Math.max(currentPos, relativeEnd);
        });
        
        // Add any remaining unformatted text
        if (currentPos < line.length) {
          segments.push(
            <span key="remaining">{line.substring(currentPos)}</span>
          );
        }
        
        return (
          <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">
            {segments}
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
