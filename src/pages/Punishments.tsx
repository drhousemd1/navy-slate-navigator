import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { useSyncManager } from '@/data/sync/useSyncManager';
import { usePunishments } from '@/data/queries/usePunishments';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { usePreloadPunishments } from "@/data/preload/usePreloadPunishments";
import { useDeletePunishment } from "@/data/mutations/useDeletePunishment";
import { useCreatePunishmentOptimistic } from '@/data/mutations/useCreatePunishmentOptimistic';
import { useUpdatePunishmentOptimistic } from '@/data/mutations/useUpdatePunishmentOptimistic';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';

// Preload punishments data from IndexedDB before component renders
usePreloadPunishments()();

const PunishmentCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-5 w-16" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <div className="flex justify-end items-center pt-2">
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { punishments, isLoading, error } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutateAsync: deletePunishmentAsync } = useDeletePunishment();
  const { mutateAsync: createPunishmentAsync } = useCreatePunishmentOptimistic();
  const { mutateAsync: updatePunishmentAsync } = useUpdatePunishmentOptimistic();
  
  const { syncNow } = useSyncManager({ 
    intervalMs: 60000,
    enabled: true 
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  
  const showLoader = isInitialLoad && isLoading && punishments.length === 0;
  
  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };
  
  useEffect(() => {
    contentRef.current = {
      handleAddNewPunishment
    };
    
    return () => {
      contentRef.current = {};
    };
  }, [contentRef, handleAddNewPunishment]);
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishment = async (punishmentData: Partial<PunishmentData>) => {
    try {
      if (punishmentData.id) {
        await updatePunishmentAsync({
          id: punishmentData.id,
          punishment: punishmentData
        });
      } else {
        await createPunishmentAsync(punishmentData);
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error saving punishment (from component):", error);
    }
  };
  
  const handleDeletePunishment = async (id: string) => {
    try {
      await deletePunishmentAsync(id);
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive"
      });
    }
  };
  
  if (showLoader) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="space-y-4 mt-4">
          <PunishmentCardSkeleton />
          <PunishmentCardSkeleton />
          <PunishmentCardSkeleton />
        </div>
      </div>
    );
  }
  
  if (!isLoading && punishments.length === 0) {
    return (
      <div className="p-4 pt-6">
        <PunishmentsHeader />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Skull className="h-16 w-16 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Punishments Yet</h3>
          <p className="text-gray-400 mb-4">Create your first punishment to get started</p>
          <button
            onClick={handleAddNewPunishment}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition-colors"
          >
            Create Punishment
          </button>
        </div>
        
        <PunishmentEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          punishmentData={currentPunishment}
          onSave={handleSavePunishment}
          onDelete={handleDeletePunishment}
        />
      </div>
    );
  }
  
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <div className="flex flex-col space-y-4 mt-4">
        {punishments.map((punishment) => (
          <PunishmentCard
            key={punishment.id}
            {...punishment}
            onEdit={() => handleEditPunishment(punishment)}
          />
        ))}
      </div>
      
      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={currentPunishment}
        onSave={handleSavePunishment}
        onDelete={handleDeletePunishment}
      />
    </div>
  );
};

const Punishments: React.FC = () => {
  const contentRef = useRef<{ handleAddNewPunishment?: () => void }>({});
  
  const handleAddNewPunishment = () => {
    if (contentRef.current.handleAddNewPunishment) {
      contentRef.current.handleAddNewPunishment();
    }
  };
  
  return (
    <AppLayout onAddNewItem={handleAddNewPunishment}>
      <ErrorBoundary fallbackMessage="Could not load punishments. Please try reloading.">
        <PunishmentsContent contentRef={contentRef} />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Punishments;
