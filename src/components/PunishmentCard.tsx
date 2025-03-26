
import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Minus, Skull } from 'lucide-react';
import { Badge } from './ui/badge';
import FrequencyTracker from './task/FrequencyTracker';
import { useRewards } from '../contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';
import PunishmentEditor from './PunishmentEditor';

interface PunishmentCardProps {
  title: string;
  description: string;
  points: number;
  icon?: React.ReactNode;
  id?: string;
  icon_name?: string;
  icon_color?: string;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({
  title,
  description,
  points,
  icon = <Skull className="h-5 w-5 text-white" />,
  id,
  icon_name,
  icon_color = '#ea384c'
}) => {
  const { totalPoints, setTotalPoints } = useRewards();
  // Track punishment application for each day of the week
  const [frequencyData, setFrequencyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  // State for editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handlePunish = () => {
    // Deduct points
    const newTotal = totalPoints - points;
    setTotalPoints(newTotal);
    
    // Update the frequency tracker for the current day
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const newFrequencyData = [...frequencyData];
    newFrequencyData[today] = 1; // Mark today as punished
    setFrequencyData(newFrequencyData);
    
    // Show toast notification
    toast({
      title: "Punishment Applied",
      description: `${points} points deducted. New total: ${newTotal} points.`,
      variant: "destructive",
    });
  };

  const handleEdit = () => {
    setIsEditorOpen(true);
  };

  const handleSavePunishment = async (updatedPunishment: any) => {
    // In a real app, you would save this to a database or state management
    console.log("Updated punishment:", updatedPunishment);
    
    // For now, we'll just show a toast notification
    toast({
      title: "Punishment Updated",
      description: "Your changes have been saved.",
    });
    
    return Promise.resolve();
  };

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-red-500 bg-navy">
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
              <h3 className="text-xl font-semibold text-white">
                {title}
              </h3>
              
              <div className="text-sm text-gray-300 mt-1">
                {description}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            {/* Frequency tracker with current day data */}
            <FrequencyTracker 
              frequency="daily" 
              frequency_count={frequencyData.reduce((acc, val) => acc + val, 0)} 
              calendar_color="#ea384c"
              usage_data={frequencyData}
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
          icon_color
        }}
        onSave={handleSavePunishment}
      />
    </>
  );
};

export default PunishmentCard;
