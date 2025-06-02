
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';
import { StandardLoading, StandardError, StandardEmpty } from '@/components/common/StandardizedStates';

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean;
  onEditPunishment: (punishment: PunishmentData) => void;
  error?: Error | null;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  error,
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
        <PunishmentCard
          key={punishment.id}
          {...punishment}
          onEdit={() => onEditPunishment(punishment)}
        />
      ))}
    </div>
  );
};

export default PunishmentList;
