
import { useState, useEffect } from 'react';
import { Reward } from '@/lib/rewardUtils';

interface UseRewardImageCarouselProps {
  reward: Reward;
  globalCarouselIndex: number;
}

interface UseRewardImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const useRewardImageCarousel = ({ 
  reward, 
  globalCarouselIndex 
}: UseRewardImageCarouselProps): UseRewardImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(
    reward?.background_image_url || null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevBackgroundUrl, setPrevBackgroundUrl] = useState<string | null>(null);

  // Handle changes to the reward's background image
  useEffect(() => {
    const currentBackgroundUrl = reward?.background_image_url || null;
    
    // Only update if the background image has changed
    if (currentBackgroundUrl !== prevBackgroundUrl) {
      setPrevBackgroundUrl(currentBackgroundUrl);
      setVisibleImage(currentBackgroundUrl);
      setTransitionImage(null);
      setIsTransitioning(false);
    }
  }, [reward?.background_image_url, prevBackgroundUrl]);

  // Handle carousel index changes (for future multi-image support)
  useEffect(() => {
    // Currently, rewards only have a single background image
    // This effect is here to maintain consistency with AdminTesting
    // and prepare for potential multi-image support in the future
    
    const currentBackground = reward?.background_image_url;
    if (!currentBackground || currentBackground === visibleImage) return;
    
    // Preload the image
    const preload = new Image();
    preload.src = currentBackground;
    
    preload.onload = () => {
      setTransitionImage(currentBackground);
      setIsTransitioning(false);
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          
          const timeout = setTimeout(() => {
            setVisibleImage(currentBackground);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
    
    preload.onerror = () => {
      console.error("Failed to load image:", currentBackground);
      setVisibleImage(currentBackground);
    };
  }, [globalCarouselIndex, reward?.background_image_url, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
