
import React from 'react';

interface PunishmentBackgroundProps {
  background_image_url?: string;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
}

const PunishmentBackground: React.FC<PunishmentBackgroundProps> = ({
  background_image_url,
  background_opacity,
  focal_point_x,
  focal_point_y
}) => {
  if (!background_image_url) return null;
  
  const backgroundImageStyle: React.CSSProperties = {
    backgroundImage: `url(${background_image_url})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
    backgroundRepeat: 'no-repeat',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: background_opacity / 100,
    zIndex: 0
  };

  return <div style={backgroundImageStyle} aria-hidden="true" />;
};

export default PunishmentBackground;
