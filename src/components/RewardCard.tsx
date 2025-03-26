import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Calendar, Box, Ticket } from 'lucide-react';
import TaskIcon from './task/TaskIcon';
import PointsBadge from './task/PointsBadge';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import HighlightedText from './task/HighlightedText';

interface RewardCardProps {
  title: string;
  description: string;
  cost: number;
  supply: number;
  iconName?: string;
  iconColor?: string;
  onBuy?: () => void;
  onUse?: () => void;
  onEdit?: () => void;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  usageData?: boolean[];
  frequencyCount?: number;
}

const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  cost,
  supply,
  iconName = 'Gift',
  iconColor = '#9b87f5',
  onBuy,
  onUse,
  onEdit,
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB',
  usageData = Array(7).fill(false),
  frequencyCount = 0
}) => {
  const { toast } = useToast();

  const handleBuyClick = () => {
    if (onBuy) {
      onBuy();
      toast({
        title: "Reward Purchased",
        description: `You purchased ${title}`,
      });
    }
  };

  const handleUseClick = () => {
    if (onUse) {
      onUse();
      toast({
        title: "Reward Used",
        description: `You used ${title}`,
      });
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit();
    }
  };

  const cardBorderStyle = supply > 0 
    ? {
        borderColor: '#FFD700',
        boxShadow: '0 0 8px 2px rgba(255, 215, 0, 0.6)'
      } 
    : {};

  return (
    <Card 
      className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy"
      style={cardBorderStyle}
    >
      {backgroundImage && (
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
          }}
        />
      )}
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 text-white font-bold flex items-center gap-1">
              <Box className="h-3 w-3" />
              <span>{supply}</span>
            </Badge>
            
            {supply > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="p-1 h-7 text-blue-500 border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-1"
                onClick={handleUseClick}
              >
                <Ticket className="h-4 w-4" />
                <span>Use</span>
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <PointsBadge points={-cost} />
            <Button
              variant="default"
              size="sm"
              className="bg-nav-active text-white hover:bg-nav-active/90 h-7"
              onClick={handleBuyClick}
            >
              Buy
            </Button>
          </div>
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
              <TaskIcon 
                icon_name={iconName} 
                icon_color={iconColor} 
              />
            </div>
          </div>
          
          <div className="flex flex-col">
            {highlight_effect ? (
              <div className="inline-flex flex-col items-start">
                <div className="inline-block max-w-fit">
                  <HighlightedText 
                    text={title}
                    highlight={true}
                    color={title_color}
                  />
                </div>
                <div className="inline-block max-w-fit mt-1">
                  <HighlightedText
                    text={description}
                    highlight={true}
                    color={subtext_color}
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold" style={{ color: title_color }}>
                  {title}
                </h3>
                <div className="text-sm mt-1" style={{ color: subtext_color }}>
                  {description}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <WeeklyUsageTracker 
            usageData={usageData}
            calendarColor={calendar_color}
          />
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
              onClick={handleEditClick}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface WeeklyUsageTrackerProps {
  usageData: boolean[];
  calendarColor: string;
}

const WeeklyUsageTracker: React.FC<WeeklyUsageTrackerProps> = ({ 
  usageData, 
  calendarColor 
}) => {
  return (
    <div className="flex space-x-1 items-center">
      <Calendar 
        className="h-4 w-4 mr-1" 
        style={{ color: calendarColor }}
      />
      <div className="flex space-x-1">
        {usageData.map((used, index) => (
          <div 
            key={index}
            className={`w-4 h-4 rounded-full border ${used ? 'border-transparent' : 'bg-transparent'}`}
            style={{
              backgroundColor: used ? calendarColor : 'transparent',
              borderColor: used ? 'transparent' : calendarColor || 'rgba(142, 145, 150, 0.5)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default RewardCard;
