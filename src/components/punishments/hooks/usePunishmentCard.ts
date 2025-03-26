
import { useState } from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentCardProps {
  id?: string;
  points: number;
}

export const usePunishmentCard = ({ id, points }: UsePunishmentCardProps) => {
  const { totalPoints, setTotalPoints } = useRewards();
  const { applyPunishment, getPunishmentHistory, updatePunishment, deletePunishment } = usePunishments();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const history = id ? getPunishmentHistory(id) : [];
  
  const currentDate = new Date();
  const currentDay = currentDate.getDay();
  
  const weekData = [0, 0, 0, 0, 0, 0, 0];
  
  history.forEach(item => {
    const itemDate = new Date(item.applied_date);
    const daysSinceToday = Math.floor((currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceToday < 7) {
      const dayIndex = item.day_of_week;
      weekData[dayIndex] = 1;
    }
  });
  
  const frequencyCount = weekData.reduce((acc, val) => acc + val, 0);
  
  const handlePunish = async () => {
    if (!id) return;
    
    try {
      const newTotal = totalPoints - points;
      setTotalPoints(newTotal);
      
      await applyPunishment(id, points);
    } catch (error) {
      console.error('Error applying punishment:', error);
      setTotalPoints(totalPoints);
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (updatedPunishment: any) => {
    if (!id) return Promise.resolve();
    
    try {
      await updatePunishment(id, updatedPunishment);
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating punishment:", error);
      return Promise.reject(error);
    }
  };

  const handleDeletePunishment = async () => {
    if (!id) return;
    
    try {
      await deletePunishment(id);
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error deleting punishment:", error);
    }
  };

  return {
    isEditorOpen,
    setIsEditorOpen,
    weekData,
    frequencyCount,
    handlePunish,
    handleEdit,
    handleSavePunishment,
    handleDeletePunishment
  };
};
