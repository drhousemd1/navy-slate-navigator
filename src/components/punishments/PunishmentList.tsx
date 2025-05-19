
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';
import EmptyState from '@/components/common/EmptyState';
// Button is no longer needed here if the action is removed from EmptyState
// import { Button } from '@/components/ui/button';
import { LoaderCircle, AlertTriangle, ShieldAlert } from 'lucide-react'; // Added ShieldAlert, PlusCircle removed if not used elsewhere in this file

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean;
  onEditPunishment: (punishment: PunishmentData) => void;
  onCreatePunishmentClick?: () => void; // This prop can remain if used elsewhere, but not for this EmptyState
  error?: Error | null;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  // onCreatePunishmentClick, // No longer directly used for the main empty state button
  error 
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading punishments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 mt-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-slate-400">Error loading punishments: {error.message}</p>
      </div>
    );
  }

  if (punishments.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert} // Changed icon
        title="No Punishments Yet"
        description="It looks like there are no punishments defined." // Updated description
        // action prop removed, so no button will be rendered here by EmptyState
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
