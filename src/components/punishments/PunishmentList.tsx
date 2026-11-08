
import React from 'react';
import { PunishmentData } from '@/contexts/punishments/types';
import { StandardLoading, StandardError, StandardEmpty } from '@/components/common/StandardizedStates';

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean;
  onEditPunishment: (punishment: PunishmentData) => void;
  error?: Error | null;
  renderCard: (punishment: PunishmentData) => React.ReactNode;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  error,
  renderCard,
}) => {

  if (isLoading && punishments.length === 0) {
    return <StandardLoading />;
  }

  if (error && punishments.length === 0) {
    return <StandardError />;
  }

  if (!isLoading && punishments.length === 0 && !error) {
    return <StandardEmpty />;
  }

  return (
    <div className="space-y-4 mt-4">
      {punishments.map((punishment) => (
        <React.Fragment key={punishment.id}>{renderCard(punishment)}</React.Fragment>
      ))}
    </div>
  );
};

export default PunishmentList;
