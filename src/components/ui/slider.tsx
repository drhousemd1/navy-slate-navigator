import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.AriaAttributes {
  id?: string
  min?: number
  max?: number
  step?: number
  value: number[]
  onValueChange: (value: number[]) => void
  className?: string
  disabled?: boolean
  fillColor?: string
  backgroundColor?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, onValueChange, disabled = false, fillColor, backgroundColor, ...inputProps }, ref) => {
    const currentValue = value[0] ?? min
    const percentage = max > min
      ? Math.max(0, Math.min(100, ((currentValue - min) / (max - min)) * 100))
      : 0

    return (
      <div ref={ref} className={cn("relative w-full py-4", className)}>
        <div
          className="w-full h-2 rounded-full relative"
          style={{ backgroundColor: backgroundColor || 'hsl(var(--light-navy))' }}
        >
          <div
            className="absolute h-full rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: fillColor || 'hsl(var(--nav-active))'
            }}
          />
          {/* The native control supplies keyboard, touch and label semantics;
              the existing track and thumb remain the visible presentation. */}
          <input
            {...inputProps}
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            disabled={disabled}
            onChange={(event) => onValueChange([event.currentTarget.valueAsNumber])}
            className="peer absolute left-0 top-1/2 z-10 m-0 h-10 w-full -translate-y-1/2 cursor-pointer opacity-0 disabled:cursor-default"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-5 h-5 bg-white rounded-full shadow-md transform -translate-y-1/2 -translate-x-1/2 peer-active:border-2 peer-active:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
            style={{ left: `${percentage}%`, top: '50%' }}
          />
        </div>
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
