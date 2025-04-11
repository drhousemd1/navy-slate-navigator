import React, { useEffect, useState } from "react";
import { usePunishmentImageCarousel } from "./hooks/usePunishmentImageCarousel";

interface PunishmentBackgroundCarouselProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImageUrl?: string;
  carouselTimer?: number;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
}

const PunishmentBackgroundCarousel: React.FC<PunishmentBackgroundCarouselProps> = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
}) => {
  const images: string[] =
    backgroundImages && backgroundImages.length > 0
      ? backgroundImages.filter((img): img is string => !!img)
      : backgroundImageUrl
      ? [backgroundImageUrl]
      : [];

  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setGlobalCarouselIndex((prev) => prev + 1);
    }, carouselTimer * 1000);
    return () => clearInterval(interval);
  }, [carouselTimer, images.length]);

  const {
    visibleImage,
    transitionImage,
    isTransitioning,
  } = usePunishmentImageCarousel({
    images,
    globalCarouselIndex,
  });

  if (!visibleImage && !transitionImage) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
      {/* Base image (always visible, never fades out) */}
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            transition: "opacity 2s ease-in-out",
            opacity: backgroundOpacity / 100,
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}

      {/* Fading-in image, only appears during transition */}
      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          style={{
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            transition: "opacity 2s ease-in-out",
            opacity: isTransitioning ? backgroundOpacity / 100 : 0,
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default PunishmentBackgroundCarousel;
