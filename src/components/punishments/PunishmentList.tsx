
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Skull } from 'lucide-react';

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean; // True if loading initial data and punishments array is empty
  onEditPunishment: (punishment: PunishmentData) => void;
  onCreatePunishmentClick?: () => void;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  onCreatePunishmentClick
}) => {
  if (isLoading) { // Simplified: if isLoading is true, show loading. Assumes isLoading is true only when punishments.length === 0 initially.
    return <div className="text-center py-10 text-slate-400">Loading punishments...</div>;
  }

  if (punishments.length === 0) {
    return (
      <EmptyState
        icon={Skull}
        title="No Punishments Yet"
        description="You currently have no punishments. Please create one to continue."
        action={onCreatePunishmentClick && (
          <Button 
            onClick={onCreatePunishmentClick} 
            className="mt-4"
          >
            Create Punishment
          </Button>
        )}
      />
    );
  }

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
