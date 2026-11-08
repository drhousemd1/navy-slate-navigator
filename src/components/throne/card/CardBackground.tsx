
import React, { useEffect, useRef, useState } from 'react';

interface CardBackgroundProps {
  visibleImage: string | null;
  reducedMotion?: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  reducedMotion = false,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100
}) => {
  const [layers, setLayers] = useState({ current: visibleImage, incoming: null as string | null, fading: false });
  const currentImage = useRef(visibleImage);
  useEffect(() => {
    if (reducedMotion || !visibleImage || !currentImage.current) {
      currentImage.current = visibleImage;
      setLayers({ current: visibleImage, incoming: null, fading: false });
      return;
    }
    if (currentImage.current === visibleImage) return;
    setLayers({ current: currentImage.current, incoming: null, fading: false });
    let cancelled = false, loaded = false;
    let firstFrame: number | undefined, secondFrame: number | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    const image = new Image();
    const begin = () => {
      if (cancelled || loaded) return;
      loaded = true;
      setLayers({ current: currentImage.current, incoming: visibleImage, fading: false });
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (cancelled) return;
          setLayers(current => ({ ...current, fading: true }));
          timer = setTimeout(() => {
            if (cancelled) return;
            currentImage.current = visibleImage;
            setLayers({ current: visibleImage, incoming: null, fading: false });
          }, 2000);
        });
      });
    };
    image.onload = begin;
    image.src = visibleImage;
    if (image.complete && image.naturalWidth > 0) begin();
    return () => {
      cancelled = true; image.onload = null;
      if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [visibleImage, reducedMotion]);
  const shown = reducedMotion ? visibleImage : layers.current;
  const transitionImage = reducedMotion ? null : layers.incoming;
  const isTransitioning = layers.fading;
  if (!shown && !transitionImage) return null;
  
  return (
    <>
      {shown && (
        <img
          src={shown}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100
          }}
          draggable={false}
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
        />
      )}
    </>
  );
};

export default CardBackground;
