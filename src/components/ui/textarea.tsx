
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  formattedPreview?: boolean;
  // The editorRef prop will allow the parent to get a ref to the contentEditable div
  editorRef?: React.RefObject<HTMLDivElement>; 
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      formattedPreview,
      editorRef: parentEditorRef, // Renamed to avoid conflict with internal ref
      value, // Expect HTML string when formattedPreview is true
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
        form: null,
        select: () => {},
        setSelectionRange: () => {},
        setRangeText: () => {},
      } as unknown as HTMLTextAreaElement;
    });
    
    // Handle changes to the contentEditable div
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const htmlContent = e.currentTarget.innerHTML;
      
      if (onChange) {
        // Create a synthetic event similar to a textarea's onChange
        const event = {
          target: {
            name: props.name,
            value: htmlContent, // Send HTML content
            // Mimic other properties if needed by consumers like react-hook-form
          }
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };
    
    // Set initial content and update when value changes from outside
    // This is crucial for execCommand updates to reflect.
    React.useEffect(() => {
      if (internalEditorRef.current && typeof value === 'string' && internalEditorRef.current.innerHTML !== value) {
        internalEditorRef.current.innerHTML = value;
      }
    }, [value]);
    
    const baseStyle: React.CSSProperties = {
      lineHeight: '1.5',
      minHeight: '200px', // Should match Tailwind's min-h-[200px] if possible
      color: 'white', // Default text color
    };
    
    return (
      <div 
        className={cn(
          "flex w-full rounded-md border border-input bg-dark-navy px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-auto",
          className
        )}
        style={{
          // minHeight: '200px', // Redundant if using Tailwind class like min-h-[500px] from parent
          maxHeight: '600px', // Example max height
        }}
      >
        <div
          ref={internalEditorRef}
          contentEditable
          className="w-full focus:outline-none whitespace-pre-wrap" // text-white is inherited or applied by baseStyle
          style={baseStyle}
          onInput={handleInput}
          suppressContentEditableWarning={true}
          data-placeholder={props.placeholder}
          // dangerouslySetInnerHTML should not be needed if useEffect syncs value
          // but for initial render with HTML, it's safer:
          dangerouslySetInnerHTML={{ __html: typeof value === 'string' ? value : '' }}
          // onFocus and onBlur can be passed through if needed
          onFocus={props.onFocus as any}
          onBlur={props.onBlur as any}
        />
      </div>
    );
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
