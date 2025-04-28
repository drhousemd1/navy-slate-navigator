
import React from 'react';
import { usePunishments } from '@/contexts/PunishmentsContext';
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
  const { punishments } = usePunishments();
  
  const {
    selectedPunishment,
    isSelecting,
    getCurrentPunishment,
    handleReroll
  } = useRandomPunishmentSelection(punishments, isOpen);
  
  const { handlePunish } = useApplyRandomPunishment(onClose);
  
  const currentPunishment = getCurrentPunishment();
  
  const onPunishClick = () => {
    handlePunish(selectedPunishment);
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
