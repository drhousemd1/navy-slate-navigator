
import React from 'react';
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
  description?: string;
  points: number;
  dom_points?: number;
  icon?: React.ReactNode;
  id?: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  onEdit?: () => void;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({
  title,
  description = "", // Provide default empty string for description
  points,
  dom_points,
  id,
  icon_name,
  icon_color = '#ea384c',
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#ea384c',
  highlight_effect = false,
  background_image_url,
  background_opacity = 50,
  focal_point_x = 50,
  focal_point_y = 50,
  onEdit // Optional prop that will be used if provided
}) => {
  const {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    frequencyCount,
    punishment, // Now getting the full punishment object from context
    handlePunish,
    handleEdit,
    handleSavePunishment,
    handleDeletePunishment
  } = usePunishmentCard({ id, points, dom_points });

  // Use dom_points from the punishment context data if available, otherwise fall back to props
  const displayDomPoints = punishment?.dom_points !== undefined ? punishment.dom_points : dom_points;

  // Use the provided onEdit prop if available, otherwise use the hook's handleEdit
  const handleEditAction = onEdit || handleEdit;

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-red-500 bg-navy">
        <PunishmentBackground 
          background_image_url={background_image_url}
          background_opacity={background_opacity}
          focal_point_x={focal_point_x}
          focal_point_y={focal_point_y}
        />
        
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <PunishmentCardHeader 
            points={points}
            dom_points={displayDomPoints} 
            onPunish={handlePunish}
          />
          
          <PunishmentCardContent 
            icon_name={icon_name}
            icon_color={icon_color}
            title={title}
            description={description}
            title_color={title_color}
            subtext_color={subtext_color}
            highlight_effect={highlight_effect}
          />
          
          <PunishmentCardFooter 
            frequency_count={frequencyCount}
            calendar_color={calendar_color}
            usage_data={weekData}
            onEdit={handleEditAction} // Use the correct edit handler
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
          dom_points: displayDomPoints, // Use the value from context if available
          icon_name,
          icon_color,
          title_color,
          subtext_color,
          calendar_color,
          highlight_effect,
          background_image_url,
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
