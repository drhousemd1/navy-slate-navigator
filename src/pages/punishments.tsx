import React, { useState, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap, Plus } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentData } from '@/contexts/punishments/types';
import PunishmentEditor from '../components/PunishmentEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePunishmentsQuery } from '@/hooks/usePunishmentsQuery';

const PunishmentsContent: React.FC = () => {
  const { 
    punishments, 
    loading, 
    expectedCardCount, 
    createPunishment, 
    updatePunishment, 
    error 
  } = usePunishmentsQuery();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const renderSkeletons = () => {
    const loadedCount = punishments.length;
    const remainingToLoad = Math.max(1, expectedCardCount - loadedCount);
    
    return Array.from({ length: remainingToLoad }).map((_, index) => (
      <Skeleton key={`skeleton-${index}`} className="h-32 animate-pulse rounded-lg invisible" />
    ));
  };

  return (
    <div className="p-4 pt-6 PunishmentsContent" ref={containerRef}>
      <PunishmentsHeader />
      
      {error && !punishments.length ? (
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
      ) : punishments.length === 0 && !loading ? (
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
            .map((punishment, index) => (
              <div key={punishment.id} className="slow-fade-in">
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
              </div>
            ))}
          
          {loading && renderSkeletons()}
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
