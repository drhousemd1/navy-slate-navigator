
import React from 'react';
import { Card } from './ui/card';
import PunishmentEditor from './PunishmentEditor';
// import { cn } from '@/lib/utils'; // Not used
import PunishmentCardHeader from './punishments/PunishmentCardHeader';
import PunishmentCardContent from './punishments/PunishmentCardContent';
import PunishmentCardFooter from './punishments/PunishmentCardFooter';
import PunishmentBackground from './punishments/PunishmentBackground';
import { usePunishmentCard } from './punishments/hooks/usePunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';

interface PunishmentCardProps extends PunishmentData {
  onEdit?: (punishment: PunishmentData) => void;
}

const PunishmentCard: React.FC<PunishmentCardProps> = (props) => {
  const { 
    id, title, description, points, dom_points, dom_supply, 
    icon_name, 
    icon_color = '#ea384c', title_color = '#FFFFFF', subtext_color = '#8E9196', 
    calendar_color = '#ea384c', highlight_effect = false, background_image_url, 
    background_opacity = 50, focal_point_x = 50, focal_point_y = 50, 
    onEdit, ...restOfPunishmentData
  } = props;

  const currentPunishment: PunishmentData = {
    id, title, description, points, dom_points, dom_supply,
    icon_name, icon_color,
    title_color, subtext_color, calendar_color, highlight_effect,
    background_image_url, background_opacity, focal_point_x, focal_point_y,
    // Ensure all fields from PunishmentData are included
    usage_data: props.usage_data,
    frequency_count: props.frequency_count,
    icon_url: props.icon_url, // Ensure icon_url is included
    created_at: props.created_at, // Ensure created_at is included
    updated_at: props.updated_at, // Ensure updated_at is included
  };
  
  const {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    frequencyCount,
    handlePunish,
    handleSavePunishment,
    handleDeletePunishment
  } = usePunishmentCard({ punishment: currentPunishment });

  // dom_points is now required and non-nullable from props
  const displayDomPoints = dom_points; 

  const handleEditAction = () => {
    if (onEdit) {
      onEdit(currentPunishment);
    } else {
      setIsEditorOpen(true);
    }
  };

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
            dom_supply={dom_supply} // Pass dom_supply
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
            onEdit={handleEditAction}
          />
        </div>
      </Card>
      
      <PunishmentEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={currentPunishment}
        onSave={handleSavePunishment}
        onDelete={handleDeletePunishment}
      />
    </>
  );
};

export default PunishmentCard;
