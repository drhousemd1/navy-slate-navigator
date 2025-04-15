
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap, RefreshCcw, AlertCircle } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments, PunishmentData } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const PunishmentsContent: React.FC = () => {
  const { 
    punishments, 
    loading, 
    error,
    createPunishment, 
    updatePunishment,
    deletePunishment,
    fetchPunishments,
    globalCarouselTimer 
  } = usePunishments();
  
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
            await deletePunishment(punishment.id);
          }
        }
        
        setCleanupDone(true);
      }
    };
    
    removeDummyPunishments();
  }, [loading, punishments, deletePunishment, cleanupDone]);

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
        await updatePunishment(data.id, data);
      } else {
        // Create new punishment
        await createPunishment(data);
      }
      setIsEditorOpen(false);
      
      // Refresh data after saving
      await fetchPunishments();
    } catch (error) {
      console.error("Error saving punishment:", error);
      toast({
        title: "Error",
        description: "Failed to save punishment. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const handleRefreshData = async () => {
    try {
      await fetchPunishments();
      toast({
        title: "Refreshed",
        description: "Punishment data has been refreshed from the server"
      });
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };
  
  // Render content based on current state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 bg-navy animate-pulse rounded-lg"></div>
          ))}
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-500" />
          <h3 className="text-xl font-semibold mb-2">Connection Error</h3>
          <p className="mb-4">We're having trouble loading your punishments</p>
          <Button 
            variant="outline" 
            onClick={handleRefreshData}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }
    
    if (!punishments || punishments.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Punishments Yet</h3>
          <p>Create your first punishment to deduct points for undesirable behaviors.</p>
        </div>
      );
    }
    
    return (
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
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 pt-6 PunishmentsContent" ref={containerRef}>
      <PunishmentsHeader />
      
      {/* Conditionally render content based on state */}
      {renderContent()}
      
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
