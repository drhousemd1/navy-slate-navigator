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
import HighlightedText from './task/HighlightedText';
import TaskIcon from './task/TaskIcon';

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
  icon,
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
            <div className="h-6"></div>
            
            <div className="flex items-center gap-2">
              <Badge 
                className="bg-red-500 text-white font-bold flex items-center gap-1"
                variant="default"
              >
                <Minus className="h-3 w-3" />
                {Math.abs(points)}
              </Badge>
              
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-500 text-white hover:bg-red-600/90 h-7"
                onClick={handlePunish}
              >
                Punish
              </Button>
            </div>
          </div>
          
          <div className="flex items-start mb-auto">
            <div className="mr-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500">
                {icon_name ? (
                  <TaskIcon 
                    icon_name={icon_name} 
                    icon_color={icon_color} 
                    className="h-5 w-5"
                  />
                ) : (
                  <Skull className="h-5 w-5 text-white" />
                )}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              {highlight_effect ? (
                <div className="inline-flex flex-col items-start">
                  <div className="inline-block max-w-fit text-xl font-semibold">
                    <HighlightedText 
                      text={title}
                      highlight={true}
                      color={title_color}
                    />
                  </div>
                  <div className="inline-block max-w-fit mt-1 text-sm">
                    <HighlightedText
                      text={description}
                      highlight={true}
                      color={subtext_color}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xl font-semibold" style={{ color: title_color }}>
                    {title}
                  </div>
                  <div className="text-sm mt-1" style={{ color: subtext_color }}>
                    {description}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
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
