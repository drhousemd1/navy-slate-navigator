
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';
import EmptyState from '@/components/common/EmptyState';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import CachedDataBanner from '@/components/common/CachedDataBanner';

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean;
  onEditPunishment: (punishment: PunishmentData) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
  refetch?: () => void;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  error,
  isUsingCachedData,
  refetch
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
        error={error}
        onRetry={refetch}
      />
    );
  }

  if (!isLoading && punishments.length === 0 && !error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No Punishments Yet"
        description="It looks like there are no punishments defined."
      />
    );
  }

  return (
    <>
      {isUsingCachedData && punishments.length > 0 && <CachedDataBanner />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
