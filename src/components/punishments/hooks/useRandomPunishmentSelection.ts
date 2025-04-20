
import { useState, useRef, useEffect } from 'react';
import { PunishmentData } from '@/contexts/punishments/types';

export const useRandomPunishmentSelection = (punishments: PunishmentData[], isOpen: boolean) => {
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedPunishment(null);
      setIsSelecting(false);
    }
  }, [isOpen]);
  
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);
  
  const startRandomSelection = () => {
    if (punishments.length === 0) return;
    
    setIsSelecting(true);
    setSelectedPunishment(null);
    
    let counter = 0;
    const totalIterations = 15;
    const cycleSpeed = 80;
    
    const animateCycle = () => {
      const randomIndex = Math.floor(Math.random() * punishments.length);
      setCurrentIndex(randomIndex);
      counter++;
      
      const nextSpeed = cycleSpeed + (counter * 10);
      
      if (counter < totalIterations) {
        animationRef.current = setTimeout(animateCycle, nextSpeed);
      } else {
        setSelectedPunishment(punishments[randomIndex]);
        setIsSelecting(false);
      }
    };
    
    animationRef.current = setTimeout(animateCycle, cycleSpeed);
  };
  
  const handleReroll = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    startRandomSelection();
  };
  
  useEffect(() => {
    if (isOpen && punishments.length > 0 && !isSelecting && !selectedPunishment) {
      startRandomSelection();
    }
  }, [isOpen, punishments.length, isSelecting, selectedPunishment]);
  
  const getCurrentPunishment = () => {
    return selectedPunishment || 
      (punishments.length > 0 ? punishments[currentIndex] : null);
  };
  
  return {
    selectedPunishment,
    isSelecting,
    currentIndex,
    getCurrentPunishment,
    handleReroll,
    startRandomSelection
  };
};
