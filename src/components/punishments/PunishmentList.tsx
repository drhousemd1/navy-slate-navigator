
import React from 'react';
import PunishmentCard from '../PunishmentCard';
import { PunishmentData } from '@/contexts/punishments/types';
import EmptyState from '@/components/common/EmptyState';
// Button is no longer needed here if the action is removed from EmptyState
// import { Button } from '@/components/ui/button';
import { LoaderCircle, AlertTriangle, ShieldAlert, WifiOff } from 'lucide-react'; 
import { toast } from "@/hooks/use-toast";

interface PunishmentListProps {
  punishments: PunishmentData[];
  isLoading: boolean;
  onEditPunishment: (punishment: PunishmentData) => void;
  onCreatePunishmentClick?: () => void; // This prop can remain if used elsewhere
  error?: Error | null;
  isUsingCachedData?: boolean;
}

const PunishmentList: React.FC<PunishmentListProps> = ({ 
  punishments, 
  isLoading, 
  onEditPunishment,
  // onCreatePunishmentClick, // No longer directly used for the main empty state button
  error,
  isUsingCachedData
}) => {
  // Only show toast for cached data once
  React.useEffect(() => {
    if (isUsingCachedData) {
      toast({
        title: "Using cached data",
        description: "We're currently showing you cached punishments data due to connection issues.",
        variant: "default"
      });
    }
  }, [isUsingCachedData]);

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
      <div className="flex flex-col items-center justify-center text-center py-10 mt-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold mb-2">Error loading punishments</p>
        <p className="text-slate-400">{error.message}</p>
        <p className="text-slate-400 mt-4">We'll automatically retry loading your data.</p>
      </div>
    );
  }

  if (punishments.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No Punishments Yet"
        description="It looks like there are no punishments defined."
      />
    );
  }

  // Show a banner if using cached data but we have punishments to show
  const CachedDataBanner = isUsingCachedData && punishments.length > 0 ? (
    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-center gap-2">
      <WifiOff className="h-5 w-5 text-amber-500" />
      <span className="text-sm">Showing cached data due to connection issues.</span>
    </div>
  ) : null;

  return (
    <>
      {CachedDataBanner}
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
