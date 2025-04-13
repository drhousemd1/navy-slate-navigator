
import React from 'react';
import { cn } from '@/lib/utils';

interface CardBackgroundProps {
  images: string[];
  opacity: number;
}

export const CardBackground: React.FC<CardBackgroundProps> = ({ images, opacity }) => {
  if (!images || images.length === 0) {
    return (
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"
        style={{ opacity }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
      {images.map((image, index) => (
        <img
          key={index}
          src={image}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            index === 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ opacity }}
          alt=""
        />
      ))}
      <div className="absolute inset-0 bg-black" style={{ opacity: 1 - opacity }} />
    </div>
  );
};
