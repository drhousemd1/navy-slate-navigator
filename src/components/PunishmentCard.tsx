
import React from 'react';
import { Card } from './ui/card';
import PunishmentCardHeader from './punishments/PunishmentCardHeader';
import PunishmentCardContent from './punishments/PunishmentCardContent';
import PunishmentCardFooter from './punishments/PunishmentCardFooter';
import { PunishmentData } from '@/contexts/punishments/types';
import { usePunishmentApply } from './punishments/hooks/usePunishmentApply';
import { usePunishmentHistory } from './punishments/hooks/usePunishmentHistory';
// usePunishmentCard is not directly used for edit click based on page structure, can be removed if not needed for other card-specific logic
// import { usePunishmentCard } from './punishments/hooks/usePunishmentCard'; 

interface PunishmentCardProps {
  punishment: PunishmentData;
  onEdit?: (punishment: PunishmentData) => void;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({ punishment, onEdit }) => {
  const { handlePunish, isLoading: isLoadingApply } = usePunishmentApply({ punishment });
  
  const punishmentHistoryHook = usePunishmentHistory({ id: punishment.id || '' });
  // const history = punishmentHistoryHook.getHistory(); // history data isn't directly used by card children based on current props
  // const isLoadingHistory = punishmentHistoryHook.isLoading; // isLoadingHistory isn't directly used by card children

  // The properties handleEditClick, imgRef, zoomEnabled, toggleZoom were removed from usePunishmentCard.
  // The onEdit functionality is handled by the onEdit prop passed from the parent.

  return (
    <Card className="bg-card rounded-md shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <PunishmentCardHeader 
        points={punishment.points} 
        dom_points={punishment.dom_points}
        onPunish={handlePunish}
        isLoading={isLoadingApply}
      />

      <PunishmentCardContent 
        icon_name={punishment.icon_name}
        icon_color={punishment.icon_color}
        title={punishment.title}
        description={punishment.description || ''}
        title_color={punishment.title_color}
        subtext_color={punishment.subtext_color}
        highlight_effect={punishment.highlight_effect}
        // showIcon can be true by default or configured if needed
      />

      <PunishmentCardFooter 
        frequency_count={punishment.frequency_count || 0}
        calendar_color={punishment.calendar_color}
        usage_data={punishment.usage_data || []}
        onEdit={() => {
          if (onEdit) {
            onEdit(punishment);
          }
        }}
      />
    </Card>
  );
};

export default PunishmentCard;
