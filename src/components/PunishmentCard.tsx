import React from 'react';
import PunishmentBackground from './punishments/PunishmentBackground';
import { cn } from '@/lib/utils';

interface PunishmentCardProps {
  background_image_url?: string;
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  children?: React.ReactNode;
  className?: string;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({
  background_image_url,
  background_images = [],
  carousel_timer = 5,
  background_opacity,
  focal_point_x,
  focal_point_y,
  children,
  className
}) => {
  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <PunishmentBackground
        background_image_url={background_image_url}
        background_images={background_images}
        carousel_timer={carousel_timer}
        background_opacity={background_opacity}
        focal_point_x={focal_point_x}
        focal_point_y={focal_point_y}
      />
      <div className="relative z-20 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default PunishmentCard;