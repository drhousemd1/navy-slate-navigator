
import { useEffect, useState } from 'react';

interface CarouselInput {
  backgroundImage?: string | null;
}

export const useRewardImageCarousel = (input: CarouselInput, carouselIndex: number) => {
  const [fadeStage, setFadeStage] = useState<'fade-in' | 'fade-out'>('fade-in');

  useEffect(() => {
    setFadeStage('fade-out');
    const timeout = setTimeout(() => {
      setFadeStage('fade-in');
    }, 300);
    return () => clearTimeout(timeout);
  }, [carouselIndex]);

  return {
    backgroundUrl: input.backgroundImage || '',
    fadeStage,
  };
};
