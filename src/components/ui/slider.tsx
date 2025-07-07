
import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
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
  ({ className, min = 0, max = 100, step = 1, value, onValueChange, disabled = false, fillColor, backgroundColor, ...props }, ref) => {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    
    // Calculate current percentage for the track fill
    const percentage = ((value[0] - min) / (max - min)) * 100;
    
    const handleInteraction = (clientX: number) => {
      if (disabled || !trackRef.current) return;
      
      const trackRect = trackRef.current.getBoundingClientRect();
      const position = Math.max(0, Math.min(trackRect.width, clientX - trackRect.left));
      const percentage = position / trackRect.width;
      const newValue = Math.round((min + percentage * (max - min)) / step) * step;
      
      if (newValue !== value[0]) {
        onValueChange([Math.max(min, Math.min(max, newValue))]);
      }
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return;
      setIsDragging(true);
      handleInteraction(e.clientX);
    };
    
    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled || !e.touches[0]) return;
      setIsDragging(true);
      handleInteraction(e.touches[0].clientX);
    };
    
    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) handleInteraction(e.clientX);
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        if (isDragging && e.touches[0]) handleInteraction(e.touches[0].clientX);
      };
      
      const handleEnd = () => setIsDragging(false);
      
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
      }
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
      };
    }, [isDragging]);

    return (
      <div 
        ref={ref}
        className={cn("relative w-full py-4", className)}
        {...props}
      >
        <div
          className="w-full h-2 rounded-full relative cursor-pointer"
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ backgroundColor: backgroundColor || 'hsl(var(--light-navy))' }}
        >
          <div 
            className="absolute h-full rounded-full" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: fillColor || 'hsl(var(--nav-active))'
            }} 
          />
          <div
            className="absolute w-5 h-5 bg-white rounded-full shadow-md transform -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{ 
              left: `${percentage}%`,
              top: '50%',
              borderColor: isDragging ? 'hsl(var(--primary))' : undefined,
              borderWidth: isDragging ? '2px' : undefined
            }}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value[0]}
            tabIndex={disabled ? -1 : 0}
          />
        </div>
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
