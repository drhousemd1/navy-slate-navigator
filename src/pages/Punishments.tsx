import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import PunishmentEditor from '../components/PunishmentEditor';

import { useFetchPunishments } from '@/contexts/punishments/hooks/usePunishmentFetch';
import { useCreatePunishment } from '@/contexts/punishments/hooks/usePunishmentCreate';
import { useUpdatePunishment } from '@/contexts/punishments/hooks/usePunishmentUpdate';
import { useDeletePunishment } from '@/contexts/punishments/hooks/usePunishmentDelete';

import { PunishmentData } from '@/contexts/punishments/types';

const PunishmentsContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add global carousel index state
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(5);

  // TanStack Query hooks
  const { data: punishments, isLoading, error } = useFetchPunishments();
  const { mutate: createPunishment } = useCreatePunishment();
  const { mutate: updatePunishment } = useUpdatePunishment();
  const { mutate: deletePunishment } = useDeletePunishment();

  // Effect to increment the global carousel index using the global timer from context
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prevIndex => prevIndex + 1);
    }, globalCarouselTimer * 1000);

    return () => clearInterval(interval);
  }, [globalCarouselTimer]);

  const getIconComponent = useCallback((iconName: string) => {
    switch (iconName) {
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
  }, []);

  const handleAddNewPunishmentClick = useCallback(() => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  }, []);

  const handleSavePunishment = useCallback(async (data: PunishmentData): Promise<void> => {
    try {
      if (data.id) {
        // Update existing punishment
        updatePunishment(data);
      } else {
        // Create new punishment
        createPunishment(data as any);
      }
      setIsEditorOpen(false);
    } catch (err) {
      console.error("Error saving punishment:", err);
    }
  }, [createPunishment, updatePunishment]);

  const handleDeletePunishment = useCallback(async (id: string) => {
    try {
      deletePunishment(id);
    } catch (err) {
      console.error("Error deleting punishment:", err);
    }
  }, [deletePunishment]);

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
  }, [handleAddNewPunishmentClick]);

  return (
    <div className="p-4 pt-6 PunishmentsContent" ref={containerRef}>
      <PunishmentsHeader />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 bg-navy animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Punishments</h3>
          <p>Please try again later.</p>
        </div>
      ) : punishments && punishments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Punishments Yet</h3>
          <p>Create your first punishment to deduct points for undesirable behaviors.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {punishments && punishments.map(punishment => (
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
              carousel_timer={globalCarouselTimer} // Use the global timer from context
              globalCarouselIndex={globalCarouselIndex}
              onDelete={() => handleDeletePunishment(punishment.id!)}
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
        <PunishmentsContent />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Punishments;
