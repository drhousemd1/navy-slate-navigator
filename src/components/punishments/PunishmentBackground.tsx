import React, { useEffect, useState } from "react";

interface PunishmentBackgroundProps {
  background_images?: string[];
  carousel_timer?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  background_opacity?: number;
}

const PunishmentBackground: React.FC<PunishmentBackgroundProps> = ({
  background_images = [],
  carousel_timer = 5,
  focal_point_x = 50,
  focal_point_y = 50,
  background_opacity = 1,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!background_images || background_images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % background_images.length);
    }, Math.max(carousel_timer, 1) * 1000);
    return () => clearInterval(timer);
  }, [background_images, carousel_timer]);

  const currentImage =
    background_images.length > 0 ? background_images[index] : null;

  if (!currentImage) return null;

  const backgroundImageStyle: React.CSSProperties = {
    backgroundImage: `url(${currentImage})`,
    backgroundSize: "cover",
    backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
    backgroundRepeat: "no-repeat",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: background_opacity,
    zIndex: 0,
    transition: "background-image 0.5s ease-in-out",
  };

  return <div style={backgroundImageStyle} aria-hidden="true" />;
};

export default PunishmentBackground;