
import { useState, useEffect, useCallback } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';

export const useRandomPunishmentSelection = (isOpen: boolean) => {
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPunishment(null);
      setIsSelecting(false);
    }
  }, [isOpen]);

  const selectRandomPunishment = useCallback(async (punishments: PunishmentData[]) => {
    if (!punishments || punishments.length === 0) {
      setIsSelecting(false);
      return;
    }
    
    setIsSelecting(true);
    
    // Set timeout to simulate selection process
    setTimeout(() => {
      try {
        const availablePunishments = punishments.filter(p => p.id && !String(p.id).startsWith('temp-'));
        
        if (availablePunishments.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePunishments.length);
          setSelectedPunishment(availablePunishments[randomIndex]);
        } else {
          console.log("No available punishments to select from");
        }
      } catch (error) {
        console.error("Error selecting random punishment:", error);
      } finally {
        setIsSelecting(false);
      }
    }, 1000);
  }, []);

  // Function to get the current punishment or return null
  const getCurrentPunishment = useCallback(() => {
    return selectedPunishment;
  }, [selectedPunishment]);

  // Function to handle rerolling (selecting a new random punishment)
  const handleReroll = useCallback((punishments: PunishmentData[]) => {
    selectRandomPunishment(punishments);
  }, [selectRandomPunishment]);

  return {
    selectedPunishment,
    isSelecting,
    selectRandomPunishment,
    getCurrentPunishment,
    handleReroll
  };
};
