
import * as React from "react"
import { cn } from "@/lib/utils"
import "./custom-slider.css"

interface SliderProps {
  min?: number
  max?: number
  step?: number
  value: number[]
  onValueChange: (value: number[]) => void
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, onValueChange, disabled = false, ...props }, ref) => {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const rangeRef = React.useRef<HTMLDivElement>(null)
    const thumbRef = React.useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    
    // Calculate percentage for positioning
    const percentage = ((value[0] - min) / (max - min)) * 100
    
    // Update range width when value changes
    React.useEffect(() => {
      if (rangeRef.current) {
        rangeRef.current.style.width = `${percentage}%`
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = `${percentage}%`
      }
    }, [percentage])
    
    const getValueFromPosition = (position: number) => {
      if (!trackRef.current) return min
      
      const trackRect = trackRef.current.getBoundingClientRect()
      const trackWidth = trackRect.width
      
      // Calculate position ratio (0 to 1)
      let ratio = Math.max(0, Math.min(1, position / trackWidth))
      
      // Calculate value based on ratio
      let newValue = min + Math.round((ratio * (max - min)) / step) * step
      
      // Ensure value is within min and max
      newValue = Math.max(min, Math.min(max, newValue))
      
      return newValue
    }
    
    const updateValue = (clientX: number) => {
      if (!trackRef.current || disabled) return
      
      const trackRect = trackRef.current.getBoundingClientRect()
      const position = clientX - trackRect.left
      const newValue = getValueFromPosition(position)
      
      if (newValue !== value[0]) {
        onValueChange([newValue])
      }
    }
    
    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return
      setIsDragging(true)
      updateValue(e.clientX)
    }
    
    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled || !e.touches[0]) return
      setIsDragging(true)
      updateValue(e.touches[0].clientX)
    }
    
    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          updateValue(e.clientX)
        }
      }
      
      const handleTouchMove = (e: TouchEvent) => {
        if (isDragging && e.touches[0]) {
          updateValue(e.touches[0].clientX)
        }
      }
      
      const handleUp = () => {
        setIsDragging(false)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleUp)
      }
    }, [isDragging])
    
    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center py-4", className)}
        {...props}
      >
        <div
          ref={trackRef}
          className="slider-track"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div ref={rangeRef} className="slider-range" style={{ width: `${percentage}%` }} />
        </div>
        <div 
          ref={thumbRef}
          className="slider-thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${percentage}%` }}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value[0]}
          tabIndex={disabled ? -1 : 0}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
