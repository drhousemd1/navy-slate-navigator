
import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Minus, Skull } from 'lucide-react';
import { Badge } from './ui/badge';
import FrequencyTracker from './task/FrequencyTracker';
import { useRewards } from '../contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';
import PunishmentEditor from './PunishmentEditor';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { cn } from '@/lib/utils';

interface PunishmentCardProps {
  title: string;
  description: string;
  points: number;
  icon?: React.ReactNode;
  id?: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({
  title,
  description,
  points,
  icon = <Skull className="h-5 w-5 text-white" />,
  id,
  icon_name,
  icon_color = '#ea384c',
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#ea384c',
  highlight_effect = false,
  background_image_url,
  background_opacity = 50,
  focal_point_x = 50,
  focal_point_y = 50
}) => {
  const { totalPoints, setTotalPoints } = useRewards();
  const { applyPunishment, getPunishmentHistory, updatePunishment, deletePunishment } = usePunishments();
  
  // State for editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Get punishment history for this punishment
  const history = id ? getPunishmentHistory(id) : [];
  
  // Create weekly usage data from history
  const currentDate = new Date();
  const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Initialize a week of zeros
  const weekData = [0, 0, 0, 0, 0, 0, 0];
  
  // Fill in the data for days where punishment was applied
  history.forEach(item => {
    const itemDate = new Date(item.applied_date);
    const daysSinceToday = Math.floor((currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only include data from the current week (last 7 days)
    if (daysSinceToday < 7) {
      const dayIndex = item.day_of_week;
      weekData[dayIndex] = 1; // Mark as punished
    }
  });
  
  // Calculate frequency count (total times punishment was applied in this period)
  const frequencyCount = weekData.reduce((acc, val) => acc + val, 0);
  
  const handlePunish = async () => {
    if (!id) return;
    
    try {
      // Deduct points
      const newTotal = totalPoints - points;
      setTotalPoints(newTotal);
      
      // Record the punishment application
      await applyPunishment(id, points);
      
    } catch (error) {
      console.error('Error applying punishment:', error);
      // Restore points if there was an error
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

  // Create background image style with proper types
  const backgroundImageStyle: React.CSSProperties = background_image_url 
    ? {
        backgroundImage: `url(${background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: `${focal_point_x}% ${focal_point_y}%`,
        backgroundRepeat: 'no-repeat',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: background_opacity / 100,
        zIndex: 0
      }
    : {};

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-red-500 bg-navy">
        {background_image_url && (
          <div style={backgroundImageStyle} aria-hidden="true" />
        )}
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <div className="flex justify-between items-start mb-3">
            {/* Priority indicator placeholder */}
            <div className="h-6"></div>
            
            <div className="flex items-center gap-2">
              {/* Points deduction badge */}
              <Badge 
                className="bg-red-500 text-white font-bold flex items-center gap-1"
                variant="default"
              >
                <Minus className="h-3 w-3" />
                {Math.abs(points)}
              </Badge>
              
              {/* Punish button */}
              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                onClick={handlePunish}
              >
                Punish
              </Button>
            </div>
          </div>
          
          <div className="flex items-start mb-auto">
            <div className="mr-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500" style={{ backgroundColor: icon_color }}>
                {icon}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 
                className={cn(
                  "text-xl font-semibold", 
                  highlight_effect && "bg-yellow-300 bg-opacity-20 px-1 py-0.5 rounded"
                )}
                style={{ color: title_color }}
              >
                {title}
              </h3>
              
              <div 
                className={cn(
                  "text-sm mt-1", 
                  highlight_effect && "bg-yellow-300 bg-opacity-10 px-1 py-0.5 rounded"
                )}
                style={{ color: subtext_color }}
              >
                {description}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            {/* Frequency tracker with current day data */}
            <FrequencyTracker 
              frequency="daily" 
              frequency_count={frequencyCount} 
              calendar_color={calendar_color || "#ea384c"}
              usage_data={weekData}
            />
            
            <div className="flex space-x-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Punishment Editor */}
      <PunishmentEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        punishmentData={{
          id,
          title,
          description,
          points,
          icon_name,
          icon_color,
          title_color,
          subtext_color,
          calendar_color,
          highlight_effect,
          background_image_url,
          background_opacity,
          focal_point_x,
          focal_point_y
        }}
        onSave={handleSavePunishment}
        onDelete={handleDeletePunishment}
      />
    </>
  );
};

export default PunishmentCard;
