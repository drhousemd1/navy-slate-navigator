import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull, Loader2 } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { useSyncManager } from '@/data/sync/useSyncManager';
import { usePunishments } from '@/data/queries/usePunishments';
import { useMutation } from '@tanstack/react-query';
import { createPunishmentMutation, updatePunishmentMutation } from '@/data/punishments/mutations';
import { PunishmentData } from '@/contexts/punishments/types';
import { queryClient } from '@/data/queryClient';
import { toast } from '@/hooks/use-toast';
import { usePreloadPunishments } from "@/data/preload/usePreloadPunishments";
import { useDeletePunishment } from "@/data/mutations/useDeletePunishment";

// Preload punishments data from IndexedDB before component renders
usePreloadPunishments()();

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  const { punishments, isLoading, error: queryError, refetchPunishments } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { mutateAsync: deletePunishmentAsync } = useDeletePunishment();
  
  const { syncNow } = useSyncManager({ 
    intervalMs: 60000,
    enabled: true 
  });

  // Use centralized createPunishmentMutation
  const { mutateAsync: createPunishmentMutateAsync, error: createError } = useMutation({
    mutationFn: createPunishmentMutation(queryClient, () => {
      // This callback runs on successful mutation from createPunishmentMutation
      // The toast is already handled in createPunishmentMutation
      // Additional page-specific logic can go here if needed
    }),
    onSuccess: () => {
      // This onSuccess is for the useMutation hook itself
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      // queryClient.invalidateQueries({ queryKey: ['punishments'] }); // Already handled by createPunishmentMutation
    },
    onError: (error) => {
      console.error("Error creating punishment from Punishments.tsx:", error);
      // Toast is already handled in createPunishmentMutation, but you can add specific ones
      // toast({ title: "Creation Error", description: "Detailed error from page.", variant: "destructive" });
    }
  });

  // Use centralized updatePunishmentMutation
  const { mutateAsync: updatePunishmentMutateAsync, error: updateError } = useMutation({
    mutationFn: updatePunishmentMutation(queryClient, () => {
      // This callback runs on successful mutation from updatePunishmentMutation
      // The toast is already handled in updatePunishmentMutation
    }),
    onSuccess: (updatedPunishment) => {
       // This onSuccess is for the useMutation hook itself
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
      // queryClient.invalidateQueries({ queryKey: ['punishments'] }); // Already handled by updatePunishmentMutation
      toast({ title: "Success", description: "Punishment updated successfully." }); // Central mutation doesn't toast on success for update, so we add it here.
    },
    onError: (error) => {
      console.error("Error updating punishment from Punishments.tsx:", error);
       toast({ title: "Update Error", description: "Failed to update punishment. Please try again.", variant: "destructive" }); // Central mutation doesn't toast on error for update
    }
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
  }, [contentRef]);
  
  const handleEditPunishment = (punishment: PunishmentData) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishment = async (punishmentData: PunishmentData) => {
    // Ensure title is always present for create, as required by Omit<> type
    const dataToSave = {
        ...punishmentData,
        title: punishmentData.title || "Untitled Punishment", // Default title or rely on form validation
    };

    try {
      if (dataToSave.id && !dataToSave.id.startsWith('temp-')) { // temp- might be from optimistic update, ensure it's a real ID for update
        await updatePunishmentMutateAsync({
          id: dataToSave.id,
          punishment: dataToSave 
        });
      } else {
        // For creation, ensure all non-nullable fields required by DB (like points) have values
        const createData: Omit<Partial<PunishmentData>, 'id' | 'created_at' | 'updated_at'> & { title: string } = {
            title: dataToSave.title,
            description: dataToSave.description,
            points: dataToSave.points || 10, // Default if not provided
            icon_name: dataToSave.icon_name,
            icon_color: dataToSave.icon_color || '#ea384c',
            background_image_url: dataToSave.background_image_url,
            background_opacity: dataToSave.background_opacity === undefined ? 50 : dataToSave.background_opacity,
            title_color: dataToSave.title_color || '#FFFFFF',
            subtext_color: dataToSave.subtext_color || '#8E9196',
            calendar_color: dataToSave.calendar_color || '#ea384c',
            highlight_effect: dataToSave.highlight_effect === undefined ? false : dataToSave.highlight_effect,
            focal_point_x: dataToSave.focal_point_x === undefined ? 50 : dataToSave.focal_point_x,
            focal_point_y: dataToSave.focal_point_y === undefined ? 50 : dataToSave.focal_point_y,
            dom_points: dataToSave.dom_points // this can be null/undefined based on schema
        };
        await createPunishmentMutateAsync(createData);
      }
      // onSuccess in useMutation hooks will handle closing editor
    } catch (error) {
      // Errors are caught by useMutation's onError, additional generic catch here if needed
      console.error("Error in handleSavePunishment:", error);
      // No specific toast here, rely on mutation's onError toasts
    }
  };
  
  const handleDeletePunishment = async (id: string) => {
    try {
      await deletePunishmentAsync(id);
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (error) {
      console.error("Error deleting punishment:", error);
      // Toast is handled by useDeletePunishment hook
    }
  };
  
  if (showLoader) {
    return (
      <div className="p-4 pt-6 flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="mt-4 text-white">Loading punishments...</p>
      </div>
    );
  }
  
  if (queryError) {
    return (
      <div className="p-4 pt-6 flex flex-col items-center justify-center h-[80vh] text-center">
        <Skull className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Punishments</h3>
        <p className="text-gray-400 mb-4">
          There was a problem fetching punishments. Please try again later.
        </p>
        <button
            onClick={() => refetchPunishments()}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition-colors mt-2"
          >
            Retry
          </button>
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
  
  // Normal render with data
  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <div className="flex flex-col space-y-4">
        {punishments.map((punishment) => (
          <PunishmentCard
            key={punishment.id}
            id={punishment.id} // Explicitly pass known props
            title={punishment.title}
            description={punishment.description}
            points={punishment.points}
            dom_points={punishment.dom_points}
            icon_name={punishment.icon_name}
            icon_color={punishment.icon_color}
            title_color={punishment.title_color}
            subtext_color={punishment.subtext_color}
            calendar_color={punishment.calendar_color}
            highlight_effect={punishment.highlight_effect}
            background_image_url={punishment.background_image_url}
            background_opacity={punishment.background_opacity}
            focal_point_x={punishment.focal_point_x}
            focal_point_y={punishment.focal_point_y}
            // Pass the full punishment object for editing if needed, or construct carefully
            onEdit={() => handleEditPunishment(punishment)} 
          />
        ))}
      </div>
      
      <PunishmentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={currentPunishment} // currentPunishment should be full PunishmentData
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
      <PunishmentsContent contentRef={contentRef} />
    </AppLayout>
  );
};

export default Punishments;
