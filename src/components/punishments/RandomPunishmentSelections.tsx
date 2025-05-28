import React from 'react';
// import { usePunishments } from '@/contexts/PunishmentsContext'; // Old context - REMOVED
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData'; // New data hook
import { useRandomPunishmentSelection } from './hooks/useRandomPunishmentSelection';
import { useApplyRandomPunishment } from './hooks/useApplyRandomPunishment';
import RandomPunishmentSelector from './RandomPunishmentSelector';

interface RandomPunishmentSelectionsProps {
  isOpen: boolean;
  onClose: () => void;
}

const RandomPunishmentSelections: React.FC<RandomPunishmentSelectionsProps> = ({
  isOpen,
  onClose
}) => {
  const { punishments } = usePunishmentsData(); // Using new data hook
  
  const {
    selectedPunishment,
    isSelecting,
    getCurrentPunishment,
    handleReroll
  } = useRandomPunishmentSelection(punishments, isOpen); // punishments here are PunishmentData[] with usage_data
  
  const { handlePunish } = useApplyRandomPunishment(onClose);
  
  const currentPunishment = getCurrentPunishment();
  
  const onPunishClick = () => {
    // handlePunish expects selectedPunishment to be PunishmentData | null
    // selectedPunishment from useRandomPunishmentSelection is of this type.
    if (selectedPunishment) { // Ensure selectedPunishment is not null
      handlePunish(selectedPunishment);
    }
  };
  
  return (
    <RandomPunishmentSelector
      isOpen={isOpen}
      onClose={onClose}
      selectedPunishment={selectedPunishment}
      currentPunishment={currentPunishment}
      isSelecting={isSelecting}
      onPunish={onPunishClick}
      onReroll={handleReroll}
    />
  );
};

export default RandomPunishmentSelections;
