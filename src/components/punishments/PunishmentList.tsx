
import React from 'react';
import PunishmentCard from '../PunishmentCard'; // Assuming PunishmentCard exists and is correctly imported
import { PunishmentData } from '@/contexts/punishments/types';
import EmptyState from '@/components/common/EmptyState';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import ErrorDisplay from '@/components/common/ErrorDisplay';
// CachedDataBanner import removed

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean;
  onEditPunishment: (punishment: PunishmentData) => void;
  error?: Error | null;
  // isUsingCachedData prop removed
  // refetch prop removed
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  error,
  // isUsingCachedData, // removed
  // refetch // removed
}) => {

  if (isLoading && punishments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading punishments...</p>
      </div>
    );
  }

  if (error && punishments.length === 0) {
    return (
      <ErrorDisplay
        title="Error Loading Punishments"
        message={error.message || "Could not fetch punishments. Please check your connection or try again later."}
        // onRetry is not passed
      />
    );
  }

  if (!isLoading && punishments.length === 0 && !error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No Punishments Yet"
        description="You do not have any punishments yet, create one to get started."
      />
    );
  }

  return (
    <>
      {/* CachedDataBanner removed */}
      <div className="space-y-4 mt-4"> {/* Updated class here */}
        {punishments.map((punishment) => (
          <PunishmentCard
            key={punishment.id}
            {...punishment}
            onEdit={() => onEditPunishment(punishment)}
          />
        ))}
      </div>
    </>
  );
};

export default PunishmentList;
