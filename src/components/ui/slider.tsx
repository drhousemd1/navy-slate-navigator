
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
    const sliderRef = React.useRef<HTMLDivElement>(null)
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
    
    const getValueFromPosition = (clientX: number) => {
      if (!trackRef.current) return min
      
      const trackRect = trackRef.current.getBoundingClientRect()
      const trackLeft = trackRect.left
      const trackWidth = trackRect.width
      
      // Calculate position relative to track
      const position = Math.max(0, Math.min(trackWidth, clientX - trackLeft))
      
      // Calculate ratio (0 to 1)
      const ratio = position / trackWidth
      
      // Calculate value based on ratio
      const rawValue = min + ratio * (max - min)
      
      // Apply step
      const steppedValue = Math.round(rawValue / step) * step
      
      // Ensure value is within min and max
      return Math.max(min, Math.min(max, steppedValue))
    }
    
    const updateValue = (clientX: number) => {
      if (!trackRef.current || disabled) return
      
      const newValue = getValueFromPosition(clientX)
      
      if (newValue !== value[0]) {
        onValueChange([newValue])
      }
    }
    
    const handleInteractionStart = (clientX: number) => {
      if (disabled) return
      setIsDragging(true)
      updateValue(clientX)
    }
    
    const handleMouseDown = (e: React.MouseEvent) => {
      handleInteractionStart(e.clientX)
    }
    
    const handleTouchStart = (e: React.TouchEvent) => {
      if (!e.touches[0]) return
      handleInteractionStart(e.touches[0].clientX)
    }
    
    React.useEffect(() => {
      const handleInteractionMove = (clientX: number) => {
        if (isDragging) {
          updateValue(clientX)
        }
      }
      
      const handleMouseMove = (e: MouseEvent) => {
        handleInteractionMove(e.clientX)
      }
      
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          handleInteractionMove(e.touches[0].clientX)
        }
      }
      
      const handleInteractionEnd = () => {
        setIsDragging(false)
      }
      
      // Add event listeners
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleInteractionEnd)
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleInteractionEnd)
      
      // Clean up
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleInteractionEnd)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleInteractionEnd)
      }
    }, [isDragging])
    
    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center py-4", className)}
        {...props}
      >
        <div 
          ref={sliderRef} 
          className="slider-container"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div ref={trackRef} className="slider-track">
            <div 
              ref={rangeRef} 
              className="slider-range" 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div 
            ref={thumbRef}
            className="slider-thumb"
            style={{ left: `${percentage}%` }}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value[0]}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
        </div>
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
