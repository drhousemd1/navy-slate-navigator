
import React from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import { Skull } from 'lucide-react';
import TaskIcon from '@/components/task/TaskIcon';
import PointsBadge from '@/components/task/PointsBadge';
import PunishmentBackground from './PunishmentBackground';

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
          <div className="mr-4 flex-shrink-0">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: '#ea384c' }}
            >
              {punishment.icon_name ? (
                <TaskIcon 
                  icon_name={punishment.icon_name} 
                  icon_color={punishment.icon_color || '#FFFFFF'} 
                  className="h-5 w-5"
                />
              ) : (
                <Skull className="h-5 w-5" style={{ color: punishment.icon_color || '#FFFFFF' }} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xl font-semibold" style={{ color: punishment.title_color || '#FFFFFF' }}>
                  {punishment.title}
                </span>
                <span className="text-sm mt-1" style={{ color: punishment.subtext_color || '#8E9196' }}>
                  {punishment.description}
                </span>
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
