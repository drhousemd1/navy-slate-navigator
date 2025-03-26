
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
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, formattedPreview, textFormatting, ...props }, ref) => {
    if (formattedPreview) {
      const textStyle: React.CSSProperties = {
        fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
        textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
        fontSize: textFormatting?.fontSize || '1rem'
      };

      return (
        <div className="relative w-full">
          <textarea
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            ref={ref}
            {...props}
          />
          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none px-3 py-2 overflow-auto"
            style={textStyle}
            aria-hidden="true"
          >
            {props.value?.toString().split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < (props.value?.toString().split('\n').length || 0) - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
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
