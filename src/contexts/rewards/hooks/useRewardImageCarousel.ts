
import { useEffect, useState } from 'react';
import { Reward } from '@/lib/rewardUtils';

const useRewardImageCarousel = (reward: Reward, carouselIndex: number) => {
  const [fadeStage, setFadeStage] = useState<'fade-in' | 'fade-out'>('fade-in');

  useEffect(() => {
    setFadeStage('fade-out');
    const timeout = setTimeout(() => {
      setFadeStage('fade-in');
    }, 300);
    return () => clearTimeout(timeout);
  }, [carouselIndex]);

  return {
    backgroundUrl: reward.background_image_url || '',
    fadeStage,
  };
};

export default useRewardImageCarousel;
