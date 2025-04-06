
import React from 'react';

interface ImageFocalPointControlProps {
  imagePreview: string;
  position: { x: number; y: number };
  opacity: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

const ImageFocalPointControl: React.FC<ImageFocalPointControlProps> = ({
  imagePreview,
  position,
  opacity,
  isDragging,
  onMouseDown,
  onTouchStart
}) => {
  return (
    <>
      <img 
        src={imagePreview} 
        alt="Background preview" 
        className="w-full h-full object-cover"
        style={{ 
          opacity: opacity / 100,
          objectPosition: `${position.x}% ${position.y}%`
        }}
      />
      <div 
        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200"
        style={{ 
          cursor: 'crosshair',
          pointerEvents: 'auto', 
          touchAction: 'none',
          zIndex: 10,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div 
          className="absolute w-8 h-8 bg-white rounded-full border-2 border-nav-active transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
          style={{ 
            left: `${position.x}%`, 
            top: `${position.y}%`,
            animation: isDragging ? 'none' : 'pulse 2s infinite',
            boxShadow: isDragging ? '0 0 0 4px rgba(126, 105, 171, 0.5)' : '',
            zIndex: 20,
            pointerEvents: 'none' 
          }}
        />
        <span className="text-sm text-white bg-black/70 px-3 py-2 rounded-full shadow-md pointer-events-none">
          Click and drag to adjust focal point
        </span>
      </div>
    </>
  );
};

export default ImageFocalPointControl;
