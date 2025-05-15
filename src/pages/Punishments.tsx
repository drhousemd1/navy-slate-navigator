import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull, Loader2 } from 'lucide-react';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';
import { useSyncManager } from '@/data/sync/useSyncManager';
import { usePunishments } from '@/data/queries/usePunishments';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { queryClient } from '@/data/queryClient';
import { savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';
import { usePreloadPunishments } from "@/data/preload/usePreloadPunishments";
import { useDeletePunishment } from "@/data/mutations/useDeletePunishment";

const PunishmentsContent: React.FC<{
  contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }>
}> = ({ contentRef }) => {
  usePreloadPunishments(); // Called directly, hook handles its own effect.
  const { punishments, isLoading, error, refetchPunishments } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<any>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Use the delete punishment mutation hook
  const { mutateAsync: deletePunishmentAsync } = useDeletePunishment();
  
  // Use the sync manager with minimal refreshing
  const { syncNow } = useSyncManager({ 
    intervalMs: 60000, // Longer interval to avoid excessive refreshing
    enabled: true 
  });

  // Removed useEffect that was previously calling preloadPunishments

  const createPunishment = useMutation({
    mutationFn: async (punishmentData: Partial<PunishmentData>) => {
      const { data, error: supabaseError } = await supabase
        .from('punishments')
        .insert({
          title: punishmentData.title,
          description: punishmentData.description,
          points: punishmentData.points || 10,
          icon_name: punishmentData.icon_name,
          icon_color: punishmentData.icon_color || '#ea384c',
          background_image_url: punishmentData.background_image_url,
          background_opacity: punishmentData.background_opacity || 50,
          title_color: punishmentData.title_color || '#FFFFFF',
          subtext_color: punishmentData.subtext_color || '#8E9196',
          calendar_color: punishmentData.calendar_color || '#ea384c',
          highlight_effect: punishmentData.highlight_effect || false,
          focal_point_x: punishmentData.focal_point_x || 50,
          focal_point_y: punishmentData.focal_point_y || 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    },
    onSuccess: (newPunishment) => {
      queryClient.setQueryData(['punishments'], (oldPunishments: PunishmentData[] = []) => {
        const updatedPunishments = [newPunishment, ...oldPunishments];
        savePunishmentsToDB(updatedPunishments);
        return updatedPunishments;
      });
      toast({ title: "Success", description: "Punishment created successfully" });
    }
  });

  const updatePunishment = useMutation({
    mutationFn: async ({ id, punishment }: { id: string, punishment: Partial<PunishmentData> }) => {
      const { data, error: supabaseError } = await supabase
        .from('punishments')
        .update({
          title: punishment.title,
          description: punishment.description,
          points: punishment.points,
          icon_name: punishment.icon_name,
          icon_color: punishment.icon_color,
          background_image_url: punishment.background_image_url,
          background_opacity: punishment.background_opacity,
          title_color: punishment.title_color,
          subtext_color: punishment.subtext_color,
          calendar_color: punishment.calendar_color,
          highlight_effect: punishment.highlight_effect,
          focal_point_x: punishment.focal_point_x,
          focal_point_y: punishment.focal_point_y,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    },
    onSuccess: (updatedPunishment) => {
      queryClient.setQueryData(['punishments'], (oldPunishments: PunishmentData[] = []) => {
        const updatedPunishments = oldPunishments.map(p => 
          p.id === updatedPunishment.id ? updatedPunishment : p
        );
        savePunishmentsToDB(updatedPunishments);
        return updatedPunishments;
      });
      toast({ title: "Success", description: "Punishment updated successfully" });
    }
  });
  
  // Track initial mount and set loading state appropriately
  useEffect(() => {
    // Consider initial load complete after a short delay
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  
  // Only show loader on initial load when no cached data
  const showLoader = isInitialLoad && isLoading && (!punishments || punishments.length === 0);
  
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
  }, [contentRef]); // Removed handleAddNewPunishment from dependencies, it's stable
  
  const handleEditPunishment = (punishment: any) => {
    setCurrentPunishment(punishment);
    setIsEditorOpen(true);
  };
  
  const handleSavePunishment = async (punishmentData: any) => {
    try {
      if (punishmentData.id) {
        // Update existing punishment
        await updatePunishment.mutateAsync({
          id: punishmentData.id,
          punishment: punishmentData
        });
      } else {
        // Create new punishment
        await createPunishment.mutateAsync(punishmentData);
      }
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (err) { // Changed error to err to avoid conflict with error from usePunishments
      console.error("Error saving punishment:", err);
      toast({
        title: "Error",
        description: "Failed to save punishment",
        variant: "destructive"
      });
    }
  };
  
  // Handler for deleting a punishment
  const handleDeletePunishment = async (id: string) => {
    try {
      await deletePunishmentAsync(id);
      setIsEditorOpen(false);
      setCurrentPunishment(undefined);
    } catch (err) { // Changed error to err
      console.error("Error deleting punishment:", err);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive"
      });
    }
  };
  
  // Show loading state when appropriate
  if (showLoader) {
    return (
      <div className="p-4 pt-6 flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="mt-4 text-white">Loading punishments...</p>
      </div>
    );
  }
  
  // Show empty state
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
  usePreloadPunishments(); // Called directly, hook handles its own effect.
  
  // Removed useEffect that was previously calling preloadPunishments
  
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
