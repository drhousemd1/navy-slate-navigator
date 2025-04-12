
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import PriorityBadge from './task/PriorityBadge';
import PointsBadge from './task/PointsBadge';
import CompletionButton from './task/CompletionButton';
import TaskIcon from './task/TaskIcon';
import FrequencyTracker from './task/FrequencyTracker';
import HighlightedText from './task/HighlightedText';
import { getCurrentDayOfWeek } from '@/lib/taskUtils';
import TaskBackgroundCarousel from './shared/TaskBackgroundCarousel';

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  backgroundImage?: string;
  backgroundImages?: string[];
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  onEdit: () => void;
  onToggleCompletion?: (completed: boolean) => void;
  onDelete?: () => void;
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  usage_data?: number[];
  icon_url?: string;
  icon_name?: string;
  priority?: 'low' | 'medium' | 'high';
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  icon_color?: string;
  sharedImageIndex?: number;
  carouselTimer?: number;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  points,
  completed = false,
  backgroundImage,
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  onEdit,
  onToggleCompletion,
  frequency,
  frequency_count = 1,
  usage_data = Array(7).fill(0),
  icon_url,
  icon_name,
  priority = 'medium',
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB',
  icon_color = '#9b87f5',
  sharedImageIndex = 0,
  carouselTimer = 5
}) => {
  const currentDayOfWeek = getCurrentDayOfWeek();
  const currentCompletions = usage_data[currentDayOfWeek] || 0;
  const maxCompletions = frequency_count || 1;
  const isFullyCompleted = currentCompletions >= maxCompletions;

  // Handle both legacy and new background image format
  const allImages = backgroundImages && backgroundImages.length > 0 
    ? backgroundImages 
    : backgroundImage 
    ? [backgroundImage] 
    : [];

  return (
    <Card className={`relative overflow-hidden border-2 border-[#00f0ff] ${allImages.length === 0 ? 'bg-navy' : ''}`}>
      {allImages.length > 0 && (
        <TaskBackgroundCarousel
          backgroundImages={allImages}
          backgroundOpacity={backgroundOpacity}
          focalPointX={focalPointX}
          focalPointY={focalPointY}
          globalCarouselIndex={sharedImageIndex}
        />
      )}

      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <PriorityBadge priority={priority} />
          
          {onToggleCompletion && (
            <div className="flex items-center gap-2">
              <PointsBadge points={points} />
              <CompletionButton 
                completed={completed} 
                onToggleCompletion={onToggleCompletion}
                currentCompletions={currentCompletions}
                maxCompletions={maxCompletions}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
              <TaskIcon 
                icon_url={icon_url} 
                icon_name={icon_name} 
                icon_color={icon_color} 
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-semibold inline-block">
              <HighlightedText 
                text={title} 
                highlight={highlight_effect || false} 
                color={title_color} 
              />
            </h3>
            
            <div className="text-sm mt-1 inline-block">
              <HighlightedText 
                text={description} 
                highlight={highlight_effect || false} 
                color={subtext_color} 
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          {frequency && (
            <FrequencyTracker 
              frequency={frequency} 
              frequency_count={frequency_count} 
              calendar_color={calendar_color}
              usage_data={usage_data}
            />
          )}
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {isFullyCompleted && (
        <div className="absolute inset-0 z-20 bg-white/30 rounded pointer-events-none" />
      )}
    </Card>
  );
};

export default TaskCard;
