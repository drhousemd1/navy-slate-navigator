
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap, Plus } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments, PunishmentData } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';

const PunishmentsContent: React.FC = () => {
  const { 
    punishments, 
    loading, 
    currentCardLoading,
    fetchSinglePunishment,
    fetchNextPunishment,
    createPunishment, 
    updatePunishment, 
    error 
  } = usePunishments();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial load of first punishment
  useEffect(() => {
    if (punishments.length === 0 && !loading) {
      fetchSinglePunishment();
    }
  }, [punishments.length, loading, fetchSinglePunishment]);

  // Handle "Add New Punishment" event listener
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

  const handleLoadNextPunishment = async () => {
    if (loadingMore || currentCardLoading) return;
    
    setLoadingMore(true);
    try {
      await fetchNextPunishment();
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && punishments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-navy animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (error && punishments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Punishments</h3>
        <p>{error.message || "There was a problem loading your punishments. Please try refreshing the page."}</p>
        <Button 
          onClick={() => fetchSinglePunishment()} 
          className="mt-4 bg-navy hover:bg-light-navy"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (punishments.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      {punishments
        .filter(punishment => punishment.id && !String(punishment.id).startsWith('temp-'))
        .map(punishment => (
          <ErrorBoundary key={punishment.id}>
            <PunishmentCard
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
          </ErrorBoundary>
        ))}
        
      {punishments.length > 0 && (
        <div className="flex justify-center py-4">
          <Button 
            onClick={handleLoadNextPunishment}
            disabled={loadingMore || currentCardLoading}
            className="bg-navy hover:bg-light-navy"
          >
            {loadingMore || currentCardLoading ? "Loading..." : "Load Next Punishment"}
          </Button>
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
      <ErrorBoundary>
        <RewardsProvider>
          <PunishmentsProvider>
            <PunishmentsContent />
          </PunishmentsProvider>
        </RewardsProvider>
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Punishments;
