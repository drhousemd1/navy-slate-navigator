
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, PlusCircle } from 'lucide-react'; // Using Loader2 for spinner, PlusCircle for create
import PunishmentCardSkeleton from './PunishmentCardSkeleton'; // Assuming this exists for a better loading state

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean; // True if loading initial data and punishments array is empty
  onEditPunishment: (punishment: PunishmentData) => void;
  onCreatePunishmentClick?: () => void; // For the empty state button
  error?: Error | null; // Optional error prop for list-specific errors
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  onCreatePunishmentClick,
  error 
}) => {
  if (isLoading) {
    // Show skeletons for a better loading experience, matching other lists
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[...Array(3)].map((_, index) => (
          <PunishmentCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) { // If an error specific to fetching the list is passed
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 mt-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-slate-400">Error loading punishments: {error.message}</p>
        {/* Optionally, a retry button could be added here if a refetch function is passed */}
      </div>
    );
  }

  if (punishments.length === 0) {
    return (
      <EmptyState
        icon={PlusCircle} // Changed icon to something more action-oriented for "create"
        title="No Punishments Yet"
        description="You currently have no punishments. Get started by creating one."
        action={onCreatePunishmentClick && (
          <Button 
            onClick={onCreatePunishmentClick} 
            className="mt-6" // Adjusted margin
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Punishment
          </Button>
        )}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4"> {/* Using grid for layout consistency */}
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
