import React from 'react';
import PunishmentCard from '../components/PunishmentCard';
import { getIconComponent } from './Punishments'; // Import the function

interface PunishmentsListProps {
  punishments: any[]; // Replace 'any' with the actual type of punishment
  globalCarouselTimer: number;
  globalCarouselIndex: number;
}

const PunishmentsList: React.FC<PunishmentsListProps> = ({ punishments, globalCarouselTimer, globalCarouselIndex }) => {
  return (
    <div className="space-y-4">
      {punishments.map(punishment => (
        <PunishmentCard
          key={punishment.id}
          id={punishment.id}
          title={punishment.title}
          description={punishment.description || ''}
          points={punishment.points}
          icon={getIconComponent(punishment.icon_name || 'Skull')}
          icon_name={punishment.icon_name}
          icon_color={punishment.icon_color}
          title_color={punishment.title_color}
          subtext_color={punishment.subtext_color}
          calendar_color={punishment.calendar_color}
          highlight_effect={punishment.highlight_effect}
          background_image_url={punishment.background_image_url}
          background_opacity={punishment.background_opacity}
          focal_point_x={punishment.focal_point_x}
          focal_point_y={punishment.focal_point_y}
          background_images={punishment.background_images}
          carousel_timer={globalCarouselTimer} // Use the global timer from context
          globalCarouselIndex={globalCarouselIndex}
        />
      ))}
    </div>
  );
};

export default PunishmentsList;
