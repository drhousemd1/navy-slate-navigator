
import React from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import PointsBadge from '@/components/task/PointsBadge';
import PunishmentBackground from './PunishmentBackground';
import PunishmentCardContent from './PunishmentCardContent';

interface PunishmentCardProps {
  punishment: PunishmentData | null;
}

const RandomPunishmentCard: React.FC<PunishmentCardProps> = ({ punishment }) => {
  if (!punishment) return null;
  
  return (
    <div className="bg-navy border-2 border-red-500 rounded-lg p-4 mb-4 relative overflow-hidden">
      {punishment.background_image_url && (
        <PunishmentBackground
          background_image_url={punishment.background_image_url}
          background_opacity={punishment.background_opacity || 50}
          focal_point_x={punishment.focal_point_x || 50}
          focal_point_y={punishment.focal_point_y || 50}
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
                  highlight_effect={punishment.highlight_effect || false}
                  showIcon={false}
                />
              </div>
              <PointsBadge points={-punishment.points} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomPunishmentCard;
