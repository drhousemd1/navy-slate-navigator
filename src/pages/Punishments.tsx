import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { Clock, Skull, Bomb, Zap } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments, PunishmentData } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';
import PunishmentsList from '../components/punishments/PunishmentsList';

export const getIconComponent = (iconName: string) => {
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

interface PunishmentsContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const PunishmentsContent: React.FC<PunishmentsContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const { 
    punishments, 
    loading, 
    createPunishment, 
    updatePunishment,
    deletePunishment,
    globalCarouselTimer 
  } = usePunishments();
  
  const [currentPunishment, setCurrentPunishment] = useState<PunishmentData | undefined>(undefined);

  
  // Add global carousel index state
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);

  // Effect to increment the global carousel index using the global timer from context
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prevIndex => prevIndex + 1);
    }, globalCarouselTimer * 1000);
    
    return () => clearInterval(interval);
  }, [globalCarouselTimer]);

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
    } catch (error) {
      console.error("Error saving punishment:", error);
      throw error;
    }
  };

  return (
    <div className="p-4 pt-6 PunishmentsContent">
      <PunishmentsHeader />
      
      {loading ? (
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
        <PunishmentsList 
          punishments={punishments}
          globalCarouselTimer={globalCarouselTimer}
          globalCarouselIndex={globalCarouselIndex}
        />
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  return (
    <AppLayout onAddNewItem={() => setIsEditorOpen(true)}>
      <RewardsProvider>
        <PunishmentsProvider>
          <PunishmentsContent 
            isEditorOpen={isEditorOpen}
            setIsEditorOpen={(isOpen: boolean) => setIsEditorOpen(isOpen)}
          />
        </PunishmentsProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Punishments;
