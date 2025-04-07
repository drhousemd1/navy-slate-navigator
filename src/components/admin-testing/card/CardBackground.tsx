
import React, { useEffect } from 'react';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100
}) => {
  useEffect(() => {
    if (visibleImage) {
      console.log("CardBackground rendering with visibleImage:", visibleImage.substring(0, 30) + "...");
    } else {
      console.log("CardBackground rendering with no visibleImage");
    }
  }, [visibleImage]);

  if (!visibleImage && !transitionImage) {
    return (
      <div className="absolute inset-0 bg-navy z-0 opacity-50"></div>
    );
  }
  
  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100
          }}
          draggable={false}
          onError={(e) => {
            console.error("Error loading visible background image:", e);
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDEyIDJDNi40NzcxNSAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTkgOUwxNSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
          }}
        />
      )}

      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0
          }}
          draggable={false}
          onError={(e) => {
            console.error("Error loading transition background image:", e);
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDEyIDJDNi40NzcxNSAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTkgOUwxNSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
          }}
        />
      )}
    </>
  );
};

export default CardBackground;
