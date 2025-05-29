
import React from 'react';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData';
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
  const { punishments } = usePunishmentsData();
  
  const {
    selectedPunishment,
    isSelecting,
    getCurrentPunishment,
    handleReroll
  } = useRandomPunishmentSelection(punishments, isOpen);
  
  const { handlePunish } = useApplyRandomPunishment(onClose);
  
  const currentPunishment = getCurrentPunishment();
  
  const onPunishClick = () => {
    if (selectedPunishment) {
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
