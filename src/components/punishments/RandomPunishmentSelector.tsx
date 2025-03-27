
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { Button } from '@/components/ui/button';
import { Skull, RefreshCw, X } from 'lucide-react';
import TaskIcon from '@/components/task/TaskIcon';
import PointsBadge from '@/components/task/PointsBadge';

interface RandomPunishmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const RandomPunishmentSelector: React.FC<RandomPunishmentSelectorProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { punishments, applyPunishment } = usePunishments();
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPunishment(null);
      setIsSelecting(false);
    }
  }, [isOpen]);
  
  // Clean up timer on unmount
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
    const totalIterations = 15; // How many times to cycle through punishments
    const cycleSpeed = 80; // Speed in ms, gets progressively slower
    
    const animateCycle = () => {
      const randomIndex = Math.floor(Math.random() * punishments.length);
      setCurrentIndex(randomIndex);
      counter++;
      
      // Progressively slow down the animation
      const nextSpeed = cycleSpeed + (counter * 10);
      
      if (counter < totalIterations) {
        animationRef.current = setTimeout(animateCycle, nextSpeed);
      } else {
        // Selection complete
        setSelectedPunishment(punishments[randomIndex]);
        setIsSelecting(false);
      }
    };
    
    // Start the animation
    animationRef.current = setTimeout(animateCycle, cycleSpeed);
  };
  
  const handlePunish = async () => {
    if (!selectedPunishment || !selectedPunishment.id) return;
    
    try {
      await applyPunishment(selectedPunishment.id, selectedPunishment.points);
      onClose();
    } catch (error) {
      console.error("Error applying punishment:", error);
    }
  };
  
  const handleReroll = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    startRandomSelection();
  };
  
  useEffect(() => {
    // Auto-start the selection when dialog is opened
    if (isOpen && punishments.length > 0 && !isSelecting && !selectedPunishment) {
      startRandomSelection();
    }
  }, [isOpen, punishments.length]);
  
  // The punishment card that is displayed during selection and when selected
  const renderPunishmentCard = () => {
    const punishment = selectedPunishment || 
      (punishments.length > 0 ? punishments[currentIndex] : null);
    
    if (!punishment) return null;
    
    return (
      <div className="bg-navy border-2 border-red-500 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="mr-4 flex-shrink-0">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: '#ea384c' }}
            >
              {punishment.icon_name ? (
                <TaskIcon 
                  icon_name={punishment.icon_name} 
                  icon_color={punishment.icon_color || '#FFFFFF'} 
                  className="h-5 w-5"
                />
              ) : (
                <Skull className="h-5 w-5" style={{ color: punishment.icon_color || '#FFFFFF' }} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xl font-semibold" style={{ color: punishment.title_color || '#FFFFFF' }}>
                  {punishment.title}
                </span>
                <span className="text-sm mt-1" style={{ color: punishment.subtext_color || '#8E9196' }}>
                  {punishment.description}
                </span>
              </div>
              <PointsBadge points={-punishment.points} />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-red-500" />
            Random Punishment
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {isSelecting 
              ? "Selecting a random punishment..." 
              : selectedPunishment 
                ? "Your random punishment has been selected!" 
                : "Let's find out what punishment you'll get..."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {renderPunishmentCard()}
          
          {!isSelecting && selectedPunishment && (
            <div className="flex flex-col gap-3 mt-2">
              <Button 
                onClick={handlePunish} 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Apply Punishment
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleReroll} 
                  className="flex-1 flex items-center justify-center gap-1"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-roll
                </Button>
                <Button 
                  onClick={onClose} 
                  className="flex-1 flex items-center justify-center gap-1"
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {isSelecting && (
            <div className="flex justify-center mt-4">
              <div className="animate-pulse text-light-navy">
                Selecting punishment...
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RandomPunishmentSelector;
