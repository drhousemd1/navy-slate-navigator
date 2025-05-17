
import React from 'react';
import { Card } from './ui/card';
import PunishmentEditor from './PunishmentEditor';
// import { cn } from '@/lib/utils'; // Not used
import PunishmentCardHeader from './punishments/PunishmentCardHeader';
import PunishmentCardContent from './punishments/PunishmentCardContent';
import PunishmentCardFooter from './punishments/PunishmentCardFooter';
import PunishmentBackground from './punishments/PunishmentBackground';
import { usePunishmentCard } from './punishments/hooks/usePunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types'; // Import PunishmentData

interface PunishmentCardProps extends PunishmentData { // Extend PunishmentData to get all its props
  // id is now optional from PunishmentData
  // title, points, etc. are from PunishmentData
  // No need to redeclare props that are in PunishmentData
  onEdit?: (punishment: PunishmentData) => void; // Changed to pass the full punishment
}

const PunishmentCard: React.FC<PunishmentCardProps> = (props) => {
  // Destructure all props, which includes all fields from PunishmentData
  const { 
    id, title, description = "", points, dom_points, icon_name, 
    icon_color = '#ea384c', title_color = '#FFFFFF', subtext_color = '#8E9196', 
    calendar_color = '#ea384c', highlight_effect = false, background_image_url, 
    background_opacity = 50, focal_point_x = 50, focal_point_y = 50, 
    onEdit, ...restOfPunishmentData // Capture rest for passing to hooks/components
  } = props;

  // Create the punishment object from props
  const currentPunishment: PunishmentData = {
    id, title, description, points, dom_points, icon_name, icon_color,
    title_color, subtext_color, calendar_color, highlight_effect,
    background_image_url, background_opacity, focal_point_x, focal_point_y,
    // Add other properties from PunishmentData if they are part of `props`
    // For example, if usage_data and frequency_count are passed:
    usage_data: props.usage_data,
    frequency_count: props.frequency_count,
    // Ensure all required fields of PunishmentData are included.
    // icon_url might be needed if used by usePunishmentCard or sub-components
    icon_url: props.icon_url,
    created_at: props.created_at,
    updated_at: props.updated_at,
  };
  
  const {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    frequencyCount,
    // punishment: contextPunishment, // punishment object is now constructed from props
    handlePunish,
    // handleEdit: hookHandleEdit, // Renamed to avoid conflict
    handleSavePunishment,
    handleDeletePunishment
  } = usePunishmentCard({ punishment: currentPunishment }); // Pass the full punishment object

  // Use dom_points from the currentPunishment if available, otherwise fall back to props
  const displayDomPoints = currentPunishment?.dom_points !== undefined ? currentPunishment.dom_points : dom_points;

  const handleEditAction = () => {
    if (onEdit) {
      onEdit(currentPunishment); // Pass the full punishment object
    } else {
      setIsEditorOpen(true); // Fallback to internal editor toggle
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
        punishmentData={currentPunishment} // Pass the constructed punishment object
        onSave={handleSavePunishment}
        onDelete={handleDeletePunishment}
      />
    </>
  );
};

export default PunishmentCard;
