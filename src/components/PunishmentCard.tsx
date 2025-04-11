import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import PunishmentEditor from './PunishmentEditor';
import { cn } from '@/lib/utils';
import PunishmentCardHeader from './punishments/PunishmentCardHeader';
import PunishmentCardContent from './punishments/PunishmentCardContent';
import PunishmentCardFooter from './punishments/PunishmentCardFooter';
import PunishmentBackground from './punishments/PunishmentBackground';
import { usePunishmentCard } from './punishments/hooks/usePunishmentCard';

interface PunishmentCardProps {
  title: string;
  description: string;
  points: number;
  icon?: React.ReactNode;
  id?: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_images?: string[];
  carousel_timer?: number;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({
  title,
  description,
  points,
  id,
  icon_name,
  icon_color = '#ea384c',
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#ea384c',
  highlight_effect = false,
  background_image_url,
  background_images = [],
  carousel_timer = 5,
  background_opacity = 1,
  focal_point_x = 50,
  focal_point_y = 50
}) => {
  const {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    frequencyCount,
    handlePunish,
    handleEdit,
    handleSavePunishment,
    handleDeletePunishment
  } = usePunishmentCard({ id, points });

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!background_images || background_images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % background_images.length);
    }, Math.max(carousel_timer, 1) * 1000);
    return () => clearInterval(timer);
  }, [background_images, carousel_timer]);

  const activeBackground = background_images?.[index] || background_image_url || null;

  return (
    <>
      <Card
        className={cn(
          'relative overflow-hidden border-none text-white rounded-xl shadow-xl w-full h-full p-4',
          highlight_effect && 'ring-2 ring-red-500 animate-pulse'
        )}
      >
        <PunishmentBackground
          background_image_url={activeBackground}
          background_opacity={background_opacity ?? 1}
          focal_point_x={focal_point_x ?? 50}
          focal_point_y={focal_point_y ?? 50}
        />

        <div className="relative z-10 flex flex-col justify-between h-full w-full">
          <PunishmentCardHeader
            title={title}
            icon_name={icon_name}
            icon_color={icon_color}
            title_color={title_color}
            onEdit={() => setIsEditorOpen(true)}
          />
          <PunishmentCardContent
            description={description}
            subtext_color={subtext_color}
            frequencyCount={frequencyCount}
            weekData={weekData}
          />
          <PunishmentCardFooter
            points={points}
            onPunish={handlePunish}
            calendar_color={calendar_color}
          />
        </div>
      </Card>

      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={{
          id,
          title,
          description,
          points,
          icon_name,
          icon_color,
          title_color,
          subtext_color,
          calendar_color,
          highlight_effect,
          background_images,
          carousel_timer,
          background_opacity,
          focal_point_x,
          focal_point_y
        }}
        onSave={handleSavePunishment}
        onDelete={handleDeletePunishment}
      />
    </>
  );
};

export default PunishmentCard;