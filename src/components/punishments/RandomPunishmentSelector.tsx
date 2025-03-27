
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { PunishmentData } from '@/contexts/punishments/types';
import { Button } from '@/components/ui/button';
import { Skull, RefreshCw, X, Shuffle } from 'lucide-react';
import TaskIcon from '@/components/task/TaskIcon';
import PointsBadge from '@/components/task/PointsBadge';
import PunishmentBackground from './PunishmentBackground';
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';

interface RandomPunishmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const RandomPunishmentSelector: React.FC<RandomPunishmentSelectorProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { punishments, applyPunishment } = usePunishments();
  const { totalPoints, setTotalPoints } = useRewards();
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
  
  const handlePunish = async () => {
    if (!selectedPunishment || !selectedPunishment.id) return;
    
    try {
      // First update the total points in the UI immediately
      const newTotal = totalPoints - selectedPunishment.points;
      setTotalPoints(newTotal);
      
      // Then call the applyPunishment function
      await applyPunishment(selectedPunishment.id, selectedPunishment.points);
      
      // Show success toast
      toast({
        title: "Punishment Applied",
        description: `${selectedPunishment.points} points deducted.`,
        variant: "destructive",
      });
      
      onClose();
    } catch (error) {
      console.error("Error applying punishment:", error);
      // Revert the point deduction if there was an error
      setTotalPoints(totalPoints);
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    }
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
  }, [isOpen, punishments.length]);
  
  const getCurrentPunishment = () => {
    return selectedPunishment || 
      (punishments.length > 0 ? punishments[currentIndex] : null);
  };
  
  const renderPunishmentCard = () => {
    const punishment = getCurrentPunishment();
    
    if (!punishment) return null;
    
    return (
      <div className="bg-navy border-2 border-red-500 rounded-lg p-4 mb-4 relative overflow-hidden">
        {punishment.background_image_url && (
          <PunishmentBackground
            background_image_url={punishment.background_image_url}
            background_opacity={punishment.background_opacity || 50}
            focal_point_x={punishment.focal_point_x || 50}
            focal_point_y={punishment.focal_point_y || 50}
          />
        )}
        <div className="relative z-10">
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
      </div>
    );
  };
  
  const currentPunishment = getCurrentPunishment();
  const backgroundImageStyle = currentPunishment?.background_image_url ? {
    backgroundImage: `url(${currentPunishment.background_image_url})`,
    backgroundSize: 'cover',
    backgroundPosition: `${currentPunishment.focal_point_x || 50}% ${currentPunishment.focal_point_y || 50}%`,
    opacity: (currentPunishment.background_opacity || 50) / 100
  } : undefined;
  
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
                  style={{ backgroundColor: '#334155' }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-roll
                </Button>
                <Button 
                  onClick={onClose} 
                  className="flex-1 flex items-center justify-center gap-1"
                  variant="outline"
                  style={{ backgroundColor: '#1e293b' }}
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
