
import React, { useState } from 'react';
import { Card } from './ui/card';
import PunishmentCardHeader from './punishments/PunishmentCardHeader';
import PunishmentCardContent from './punishments/PunishmentCardContent';
import PunishmentCardFooter from './punishments/PunishmentCardFooter';
import { PunishmentData } from '@/contexts/punishments/types';
import { usePunishmentApply } from './punishments/hooks/usePunishmentApply';
import { usePunishmentHistory } from './punishments/hooks/usePunishmentHistory';
import { usePunishmentCard } from './punishments/hooks/usePunishmentCard';

interface PunishmentCardProps {
  punishment: PunishmentData;
  onEdit?: (punishment: PunishmentData) => void;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({ punishment, onEdit }) => {
  const { handlePunish, isLoading } = usePunishmentApply({ punishment });
  const { history, isLoading: isLoadingHistory } = usePunishmentHistory(punishment.id || '');
  const { handleEditClick, imgRef, zoomEnabled, toggleZoom } = usePunishmentCard({ punishment, onEdit });

  return (
    <Card className="bg-card rounded-md shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <PunishmentCardHeader 
        points={punishment.points} 
        dom_points={punishment.dom_points}
        onPunish={handlePunish}
        isLoading={isLoading} // Pass loading state to header
      />

      <PunishmentCardContent 
        punishment={punishment}
        imgRef={imgRef}
        zoomEnabled={zoomEnabled}
        toggleZoom={toggleZoom}
      />

      <PunishmentCardFooter 
        punishmentId={punishment.id || ''}
        onEdit={handleEditClick}
        history={history}
        isLoadingHistory={isLoadingHistory}
      />
    </Card>
  );
};

export default PunishmentCard;
