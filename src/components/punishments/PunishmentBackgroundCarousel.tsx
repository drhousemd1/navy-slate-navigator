import React, { useEffect, useState } from "react";

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

  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % images.length);
        setFade(true);
      }, 2000); // match 2s fade duration
    }, carouselTimer * 1000);
    return () => clearInterval(interval);
  }, [images.length, carouselTimer]);

  if (!images.length) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transition: "opacity 2s ease-in-out",
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: i === index && fade ? backgroundOpacity / 100 : 0,
          }}
        />
      ))}
    </div>
  );
};

export default PunishmentBackgroundCarousel;
