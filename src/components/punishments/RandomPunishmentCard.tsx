import React, { useEffect, useState } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import PointsBadge from '@/components/task/PointsBadge';
import PunishmentBackground from './PunishmentBackground';
import PunishmentCardContent from './PunishmentCardContent';
import { cn } from '@/lib/utils';

interface PunishmentCardProps {
  punishment: PunishmentData | null;
}

const RandomPunishmentCard: React.FC<PunishmentCardProps> = ({ punishment }) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (!punishment) return null;

  const {
    background_images = [],
    background_image_url,
    carousel_timer = 5,
    background_opacity = 50,
    focal_point_x = 50,
    focal_point_y = 50,
  } = punishment;

  const imageList = Array.isArray(background_images) && background_images.length > 0
    ? background_images
    : background_image_url
      ? [background_image_url]
      : [];

  const activeImage = imageList[selectedIndex] || imageList[carouselIndex] || '';

  useEffect(() => {
    if (imageList.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % imageList.length);
    }, (carousel_timer || 5) * 1000);
    return () => clearInterval(interval);
  }, [imageList.length, carousel_timer]);

  return (
    <div className="bg-navy border-2 border-red-500 rounded-lg p-4 mb-4 relative overflow-hidden">
      {activeImage && (
        <PunishmentBackground
          background_image_url={activeImage}
          background_opacity={background_opacity}
          focal_point_x={focal_point_x}
          focal_point_y={focal_point_y}
        />
      )}
      <div className="relative z-10">
        <div className="flex items-start">
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <PunishmentCardContent
                  icon_name={punishment.icon_name}
                  icon_color={punishment.icon_color || '#FFFFFF'}
                  title={punishment.title}
                  description={punishment.description || ''}
                  title_color={punishment.title_color || '#FFFFFF'}
                  subtext_color={punishment.subtext_color || '#8E9196'}
                />
              </div>
              <PointsBadge points={punishment.points} />
            </div>
          </div>
        </div>
      </div>

      {imageList.length > 1 && (
        <div className="absolute bottom-2 left-2 z-20 flex gap-2 bg-black/40 p-1 rounded-md">
          {imageList.map((img, index) => (
            <button
              key={index}
              className={cn(
                "h-8 w-8 bg-cover bg-center rounded border-2",
                selectedIndex === index ? "border-white" : "border-transparent"
              )}
              style={{ backgroundImage: `url(${img})` }}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RandomPunishmentCard;