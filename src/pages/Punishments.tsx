import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap, Plus } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments } from '../contexts/PunishmentsContext';
import PunishmentEditor, { PunishmentData } from '../components/PunishmentEditor';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const PunishmentsContent: React.FC = () => {
  const { punishments, loading, createPunishment } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const [initializing, setInitializing] = useState(false);
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

  useEffect(() => {
    const initSamplePunishments = async () => {
      if (!loading && punishments.length === 0 && !initializing) {
        setInitializing(true);
        
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
        
        try {
          for (const punishment of samplePunishments) {
            await createPunishment(punishment);
          }
          console.log("Sample punishments created successfully");
        } catch (error) {
          console.error("Error creating sample punishments:", error);
        } finally {
          setInitializing(false);
        }
      }
    };
    
    initSamplePunishments();
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
    return Promise.resolve();
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
      ) : punishments.length === 0 ? (
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
