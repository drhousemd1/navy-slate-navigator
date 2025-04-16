
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap, Plus } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments, PunishmentData } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';
import { Button } from '@/components/ui/button';

const PunishmentsContent: React.FC = () => {
  const { punishments, loading, createPunishment, updatePunishment, error } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [initializing, setInitializing] = useState(false);
  const samplePunishmentsCreated = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Improved sample punishment creation with sequential creation
  useEffect(() => {
    const createSamplePunishment = async (punishment: PunishmentData) => {
      try {
        await createPunishment(punishment);
        return true;
      } catch (err) {
        console.error("Error creating sample punishment:", err);
        return false;
      }
    };
    
    const initSamplePunishments = async () => {
      if (!loading && punishments.length === 0 && !initializing && !samplePunishmentsCreated.current) {
        setInitializing(true);
        samplePunishmentsCreated.current = true;
        
        const samplePunishments = [
          {
            title: "Late to Meeting",
            description: "Being late to scheduled meetings",
            points: 10,
            icon_name: "Clock",
            icon_color: "#ea384c"
          },
          {
            title: "Missed Deadline",
            description: "Missing agreed upon deadlines",
            points: 15,
            icon_name: "Bomb",
            icon_color: "#f97316"
          },
          {
            title: "Breaking Rules",
            description: "Violation of established rules",
            points: 20,
            icon_name: "Skull",
            icon_color: "#7c3aed"
          }
        ];

        // Create punishments one at a time with delay between
        let allSuccess = true;
        for (const punishment of samplePunishments) {
          const success = await createSamplePunishment(punishment);
          if (!success) {
            allSuccess = false;
            break;
          }
          // Add delay between creations to avoid race conditions
          await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        console.log("Sample punishments creation completed:", allSuccess ? "Successfully" : "With errors");
        setInitializing(false);
      }
    };

    // Only attempt to create sample punishments after a delay to ensure DB is ready
    const timer = setTimeout(() => {
      initSamplePunishments();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [loading, punishments.length, createPunishment, initializing]);

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
        await updatePunishment(data.id, data);
      } else {
        await createPunishment(data);
      }
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error saving punishment:", error);
      throw error;
    }
  };

  return (
    <div className="p-4 pt-6 PunishmentsContent" ref={containerRef}>
      <PunishmentsHeader />
      
      {loading || initializing ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 bg-navy animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Punishments</h3>
          <p>There was a problem loading your punishments. Please try refreshing the page.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-navy hover:bg-light-navy"
          >
            Refresh Page
          </Button>
        </div>
      ) : punishments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Punishments Yet</h3>
          <p>Create your first punishment to deduct points for undesirable behaviors.</p>
          <Button
            onClick={handleAddNewPunishmentClick}
            className="mt-4 bg-navy hover:bg-light-navy flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Punishment
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {punishments
            .filter(punishment => punishment.id && !String(punishment.id).startsWith('temp-'))
            .map(punishment => (
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
