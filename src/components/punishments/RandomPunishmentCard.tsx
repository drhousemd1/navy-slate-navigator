
import React from 'react';
import type { ReviewedPunishment } from './hooks/randomPunishmentReview';
import PointsBadge from '@/components/task/PointsBadge';
import PunishmentBackground from './PunishmentBackground';
import PunishmentCardContent from './PunishmentCardContent';

interface PunishmentCardProps {
  selection: ReviewedPunishment | null;
}

const RandomPunishmentCard: React.FC<PunishmentCardProps> = ({ selection }) => {
  if (!selection) return null;
  const { punishment, expectedContext } = selection;

  return (
    <div className="bg-navy border-2 border-red-500 rounded-lg p-4 mb-4 relative overflow-hidden">
      {punishment.background_image_url && (
        <PunishmentBackground
          background_image_url={punishment.background_image_url}
          background_opacity={punishment.background_opacity ?? 100}
          focal_point_x={punishment.focal_point_x ?? 50}
          focal_point_y={punishment.focal_point_y ?? 50}
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
              <span aria-label={`Sub balance: ${expectedContext.subDeduction === 0 ? '0' : `−${expectedContext.subDeduction}`} points`}>
                <PointsBadge points={-expectedContext.subDeduction} />
              </span>
              <span className="sr-only" aria-label={`Dom balance: ${expectedContext.domAward === 0 ? '0' : `+${expectedContext.domAward}`} points`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomPunishmentCard;
