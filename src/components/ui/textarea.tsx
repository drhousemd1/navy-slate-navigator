
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

    // For formatted preview, we'll create a container with an invisible textarea and a visible preview
    const containerRef = React.useRef<HTMLDivElement>(null);
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

    // Default text style for the entire content
    const textStyle: React.CSSProperties = {
      fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
      textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
      fontSize: textFormatting?.fontSize || '1rem',
      lineHeight: '1.5',
      color: 'white'
    };

    // Render formatted text
    const renderFormattedContent = () => {
      const text = props.value?.toString() || '';
      if (!text) return null;

      // Split by newlines to process line by line
      const lines = text.split('\n');
      return lines.map((line, lineIndex) => {
        // For empty lines, return a non-breaking space
        if (!line) {
          return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap min-h-[1.5em]">&nbsp;</div>;
        }

        // If no formatted sections, return the line as is
        if (!formattedSections || formattedSections.length === 0) {
          return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">{line}</div>;
        }

        // Calculate offset for this line
        let charOffset = 0;
        for (let i = 0; i < lineIndex; i++) {
          charOffset += lines[i].length + 1; // +1 for newline
        }

        // Find sections that apply to this line
        const relevantSections = formattedSections.filter(section => {
          const sectionStart = section.start;
          const sectionEnd = section.end;
          const lineStart = charOffset;
          const lineEnd = charOffset + line.length;
          return sectionStart < lineEnd && sectionEnd > lineStart;
        });

        // If no formatted sections in this line
        if (relevantSections.length === 0) {
          return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">{line}</div>;
        }

        // Sort sections by start position
        const sortedSections = [...relevantSections].sort((a, b) => a.start - b.start);

        // Build segments with proper formatting
        const segments: React.ReactNode[] = [];
        let currentPos = 0;

        for (const section of sortedSections) {
          // Calculate relative positions for this line
          const relativeStart = Math.max(0, section.start - charOffset);
          const relativeEnd = Math.min(line.length, section.end - charOffset);

          // Skip if section doesn't apply to this line
          if (relativeEnd <= 0 || relativeStart >= line.length) continue;

          // Add unformatted text before this section if needed
          if (relativeStart > currentPos) {
            segments.push(
              <span key={`plain-${currentPos}-${relativeStart}`}>
                {line.substring(currentPos, relativeStart)}
              </span>
            );
          }

          // Add formatted text segment
          segments.push(
            <span 
              key={`fmt-${relativeStart}-${relativeEnd}`}
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

          // Update current position
          currentPos = Math.max(currentPos, relativeEnd);
        }

        // Add remaining unformatted text
        if (currentPos < line.length) {
          segments.push(
            <span key={`remaining-${currentPos}`}>
              {line.substring(currentPos)}
            </span>
          );
        }

        return <div key={`line-${lineIndex}`} className="whitespace-pre-wrap">{segments}</div>;
      });
    };

    return (
      <div 
        ref={containerRef}
        className={cn(
          "relative min-h-[500px] w-full rounded-md border border-input bg-transparent text-sm",
          className
        )}
      >
        {/* Textarea for editing - invisible but functional */}
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
        
        {/* Formatted preview layer */}
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
)

Textarea.displayName = "Textarea"

export { Textarea }
