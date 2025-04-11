import React from 'react';
import PunishmentBackgroundCarousel from './PunishmentBackgroundCarousel';

interface PunishmentBackgroundProps {
  background_image_url?: string;
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
}

const PunishmentBackground: React.FC<PunishmentBackgroundProps> = ({
  background_image_url,
  background_images = [],
  carousel_timer = 5,
  background_opacity = 100,
  focal_point_x = 50,
  focal_point_y = 50
}) => {
  return (
    <PunishmentBackgroundCarousel
      backgroundImages={background_images}
      backgroundImageUrl={background_image_url}
      carouselTimer={carousel_timer}
      backgroundOpacity={background_opacity}
      focalPointX={focal_point_x}
      focalPointY={focal_point_y}
    />
  );
};

export default PunishmentBackground;