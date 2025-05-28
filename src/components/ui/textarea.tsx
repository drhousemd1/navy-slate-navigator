
import * as React from "react"
import { cn } from "@/lib/utils"
import DOMPurify from 'dompurify';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  formattedPreview?: boolean;
  editorRef?: React.RefObject<HTMLDivElement>;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      formattedPreview,
      editorRef: parentEditorRef,
      value,
      onChange,
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
          value={value}
          onChange={onChange}
          {...props}
        />
      )
    }
    
    // Use contentEditable div instead of textarea for better formatting control
    const internalEditorRef = React.useRef<HTMLDivElement>(null);

    // Combine parent ref and internal ref
    React.useImperativeHandle(parentEditorRef, () => internalEditorRef.current as HTMLDivElement);
    
    // Forward the main ref (for form libraries etc.)
    React.useImperativeHandle(ref, () => {
      return {
        value: internalEditorRef.current?.innerHTML || '',
        focus: () => internalEditorRef.current?.focus(),
        blur: () => internalEditorRef.current?.blur(),
        name: props.name,
        form: null, // Form association can be complex with contentEditable
        select: () => {
          // Basic selection handling if needed, otherwise leave empty
          if (internalEditorRef.current) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(internalEditorRef.current);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        },
        setSelectionRange: (start?: number | null, end?: number | null, direction?: "forward" | "backward" | "none" | undefined) => {
          // Implementing setSelectionRange for contentEditable is non-trivial
          // For now, this is a placeholder or could be expanded if specific behavior is needed
          if (internalEditorRef.current && typeof start === 'number' && typeof end === 'number') {
             // Basic attempt, might not cover all edge cases
            const el = internalEditorRef.current;
            const range = document.createRange();
            const sel = window.getSelection();
            
            if (el.childNodes.length > 0) {
                // Simplistic approach: assumes text nodes primarily
                // More robust solution would involve iterating through nodes
                // and calculating character offsets
                try {
                    let charCount = 0;
                    let startNode: Node | null = null, endNode: Node | null = null;
                    let startOffset = 0, endOffset = 0;

                    function findNodeAndOffset(node: Node, targetOffset: number): { node: Node | null, offset: number } {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const textLength = node.textContent?.length || 0;
                            if (charCount + textLength >= targetOffset) {
                                return { node: node, offset: targetOffset - charCount };
                            }
                            charCount += textLength;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            for (let i = 0; i < node.childNodes.length; i++) {
                                const result = findNodeAndOffset(node.childNodes[i], targetOffset);
                                if (result.node) return result;
                            }
                        }
                        return { node: null, offset: 0 };
                    }
                    
                    charCount = 0;
                    const startResult = findNodeAndOffset(el, start);
                    startNode = startResult.node;
                    startOffset = startResult.offset;

                    charCount = 0;
                    const endResult = findNodeAndOffset(el, end);
                    endNode = endResult.node;
                    endOffset = endResult.offset;

                    if (startNode && endNode && sel) {
                        range.setStart(startNode, startOffset);
                        range.setEnd(endNode, endOffset);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        if (direction === "backward") {
                          sel.extend(range.startContainer, range.startOffset);
                        }
                    }
                } catch (e) {
                    console.error("Error setting selection range:", e);
                }
            }
          }
        },
        setRangeText: (replacement: string, start?: number, end?: number, selectionMode?: SelectionMode) => {
          // Implementing setRangeText for contentEditable is also complex
          // This is a placeholder. A full implementation would require careful DOM manipulation.
          if (internalEditorRef.current && typeof start === 'number' && typeof end === 'number') {
            const currentValue = internalEditorRef.current.innerHTML;
            // This is a naive implementation and will not handle HTML correctly.
            // It's better to handle this via direct DOM manipulation based on selection.
            const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);
            internalEditorRef.current.innerHTML = DOMPurify.sanitize(newValue);
             if (onChange) {
                const event = {
                  target: { name: props.name, value: internalEditorRef.current.innerHTML }
                } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
                onChange(event);
              }
          } else if (internalEditorRef.current) { // Replace whole content if no range
            internalEditorRef.current.innerHTML = DOMPurify.sanitize(replacement);
             if (onChange) {
                const event = {
                  target: { name: props.name, value: internalEditorRef.current.innerHTML }
                } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
                onChange(event);
              }
          }
        },
      } as unknown as HTMLTextAreaElement;
    });
    
    // Handle changes to the contentEditable div
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const rawHtmlContent = e.currentTarget.innerHTML;
      // While DOMPurify on dangerouslySetInnerHTML protects rendering,
      // it's good practice to ensure the value passed up is also clean
      // if it's expected to be HTML. However, for typical form onChange,
      // the expectation is often plain text or a specific format.
      // For now, we pass the raw HTML from contentEditable, as sanitization
      // primarily occurs on rendering (value prop).
      // If this value is directly re-rendered elsewhere without sanitization,
      // that would be a separate vulnerability point.
      
      if (onChange) {
        // Create a synthetic event similar to a textarea's onChange
        const event = {
          target: {
            name: props.name,
            value: rawHtmlContent, // The raw HTML from contentEditable
          }
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };
    
    const sanitizedValue = React.useMemo(() => {
      return typeof value === 'string' ? DOMPurify.sanitize(value) : '';
    }, [value]);

    // Set initial content and update when value changes from outside
    React.useEffect(() => {
      if (internalEditorRef.current && internalEditorRef.current.innerHTML !== sanitizedValue) {
        internalEditorRef.current.innerHTML = sanitizedValue;
      }
    }, [sanitizedValue]);
    
    return (
      <div 
        className={cn(
          "flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-auto",
          className
        )}
        style={{
          minHeight: '200px', // Default min-height if not overridden by className
          maxHeight: '600px', // Default max-height
        }}
      >
        <div
          ref={internalEditorRef}
          contentEditable
          className="w-full focus:outline-none whitespace-pre-wrap text-black" // Ensure text is visible on white bg
          style={{
            lineHeight: '1.5',
            minHeight: 'inherit', // Inherit min-height from parent div
          }}
          onInput={handleInput}
          suppressContentEditableWarning={true}
          data-placeholder={props.placeholder}
          // Use dangerouslySetInnerHTML only for the initial, sanitized value.
          // Subsequent updates are handled by the useEffect.
          dangerouslySetInnerHTML={{ __html: sanitizedValue }}
          onFocus={props.onFocus as any}
          onBlur={props.onBlur as any}
        />
      </div>
    );
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
