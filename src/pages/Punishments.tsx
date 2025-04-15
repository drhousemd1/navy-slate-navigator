
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments, PunishmentData } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';
import { supabase } from "@/integrations/supabase/client";
import { useLocalSyncedData } from "@/lib/useLocalSyncedData";

const fetchPunishmentsFromSupabase = async (): Promise<PunishmentData[]> => {
  const { data, error } = await supabase.from("punishments").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching punishments:", error);
    throw error;
  }
  return data as PunishmentData[];
};

const PunishmentsContent: React.FC = () => {
  const { 
    globalCarouselTimer 
  } = usePunishments();
  
  const { data: punishments, loading } = useLocalSyncedData<PunishmentData[]>({
    key: "punishments",
    fetcher: fetchPunishmentsFromSupabase,
  });
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [cleanupDone, setCleanupDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add global carousel index state
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);

  // Effect to increment the global carousel index using the global timer from context
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prevIndex => prevIndex + 1);
    }, globalCarouselTimer * 1000);
    
    return () => clearInterval(interval);
  }, [globalCarouselTimer]);

  // Effect to delete dummy punishment cards
  useEffect(() => {
    const removeDummyPunishments = async () => {
      if (!loading && !cleanupDone && punishments && punishments.length > 0) {
        const dummyTitles = ["Late to Meeting", "Missed Deadline", "Breaking Rules"];
        
        for (const punishment of punishments) {
          if (dummyTitles.includes(punishment.title) && punishment.id) {
            console.log(`Removing dummy punishment: ${punishment.title}`);
            await handleDeletePunishment(punishment.id);
          }
        }
        
        setCleanupDone(true);
      }
    };
    
    removeDummyPunishments();
  }, [loading, punishments, cleanupDone]);

  useEffect(() => {
    const handleAddNewPunishment = () => {
      handleAddNewPunishmentClick();
    };

    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('add-new-punishment', handleAddNewPunishment);
    }

    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener('add-new-punishment', handleAddNewPunishment);
      }
    };
  }, []);

  const getIconComponent = (iconName: string) => {
    switch(iconName) {
      case 'Skull':
        return <Skull className="h-5 w-5 text-white" />;
      case 'Clock':
        return <Clock className="h-5 w-5 text-white" />;
      case 'Bomb':
        return <Bomb className="h-5 w-5 text-white" />;
      case 'Zap':
        return <Zap className="h-5 w-5 text-white" />;
      default:
        return <Skull className="h-5 w-5 text-white" />;
    }
  };

  const handleAddNewPunishmentClick = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (data: PunishmentData): Promise<void> => {
    try {
      if (data.id) {
        // Update existing punishment
        await supabase.from("punishments").update(data).eq("id", data.id);
      } else {
        // Create new punishment
        const { data: created } = await supabase.from("punishments").insert(data).select().single();
        data = created as PunishmentData;
      }

      // Update localStorage after successful save
      const existing = punishments || [];
      const updatedList = [...existing.filter(p => p.id !== data.id), data];
      localStorage.setItem("punishments", JSON.stringify(updatedList));
      
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error saving punishment:", error);
      throw error;
    }
  };

  const handleDeletePunishment = async (id: string): Promise<void> => {
    try {
      await supabase.from("punishments").delete().eq("id", id);
      
      // Update localStorage after successful delete
      const existing = punishments || [];
      const updatedList = existing.filter(p => p.id !== id);
      localStorage.setItem("punishments", JSON.stringify(updatedList));
    } catch (error) {
      console.error("Error deleting punishment:", error);
      throw error;
    }
  };

  return (
    <div className="p-4 pt-6 PunishmentsContent" ref={containerRef}>
      <PunishmentsHeader />
      
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 bg-navy animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : !punishments || punishments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Punishments Yet</h3>
          <p>Create your first punishment to deduct points for undesirable behaviors.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {punishments.map(punishment => (
            <PunishmentCard
              key={punishment.id}
              id={punishment.id}
              title={punishment.title}
              description={punishment.description || ''}
              points={punishment.points}
              icon={getIconComponent(punishment.icon_name || 'Skull')}
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
              background_images={punishment.background_images}
              carousel_timer={globalCarouselTimer}
              globalCarouselIndex={globalCarouselIndex}
              onDelete={() => handleDeletePunishment(punishment.id)}
            />
          ))}
        </div>
      )}
      
      <PunishmentEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={currentPunishment}
        onSave={handleSavePunishment}
      />
    </div>
  );
};

const Punishments: React.FC = () => {
  return (
    <AppLayout onAddNewItem={() => {
      const content = document.querySelector('.PunishmentsContent');
      if (content) {
        const event = new CustomEvent('add-new-punishment');
        content.dispatchEvent(event);
      }
    }}>
      <RewardsProvider>
        <PunishmentsProvider>
          <PunishmentsContent />
        </PunishmentsProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Punishments;
