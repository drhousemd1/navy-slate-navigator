
import React, { useEffect, useState } from 'react';
import { useRuleCarousel } from '../../carousel/RuleCarouselContext';
import { cn } from '@/lib/utils';

interface CardBackgroundProps {
  images: (string | null)[];
  opacity: number;
}

export const CardBackground: React.FC<CardBackgroundProps> = ({ images, opacity }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { timer, resyncFlag } = useRuleCarousel();

  useEffect(() => {
    if (!images || images.length === 0 || !timer) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, timer * 1000);

    return () => clearInterval(interval);
  }, [images, timer, resyncFlag]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
      {images.map((image, index) => (
        <img
          key={index}
          src={image ?? ''}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
          style={{ opacity }}
          alt=""
        />
      ))}
      <div className="absolute inset-0 bg-black" style={{ opacity: 1 - opacity }} />
    </div>
  );
};
