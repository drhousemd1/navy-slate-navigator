
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';

interface PunishmentListProps {
  punishments: PunishmentData[];
  onEditPunishment: (punishment: PunishmentData) => void;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ punishments, onEditPunishment }) => {
  return (
    <div className="flex flex-col space-y-4 mt-4">
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
