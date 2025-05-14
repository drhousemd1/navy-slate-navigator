
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import PriorityBadge from './task/PriorityBadge';
import PointsBadge from './task/PointsBadge';
import CompletionButton from './task/CompletionButton';
import CompletionCounter from './task/CompletionCounter';
import TaskIcon from './task/TaskIcon';
import FrequencyTracker from './task/FrequencyTracker';
import HighlightedText from './task/HighlightedText';
import { getCurrentDayOfWeek, Task } from '@/lib/taskUtils'; // Import Task type

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  onEdit: () => void;
  onToggleCompletion?: (completed: boolean) => void;
  onDelete?: () => void;
  frequency?: Task['frequency']; // Use Task type for frequency
  frequency_count?: number;
  usage_data?: number[];
  icon_url?: string;
  icon_name?: string;
  priority?: Task['priority']; // Use Task type for priority
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  icon_color?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  points,
  completed = false,
  backgroundImage,
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
  icon_color = '#9b87f5'
}) => {
  const currentDayOfWeek = getCurrentDayOfWeek();
  const currentCompletions = usage_data[currentDayOfWeek] || 0;
  // maxCompletions should always be at least 1 for tasks with frequency_count
  const maxCompletions = frequency_count && frequency_count > 0 ? frequency_count : 1;
  // isFullyCompleted depends on the frequency type.
  // For 'one-time' tasks, 'completed' prop is the source of truth.
  // For 'daily'/'weekly' with frequency_count, usage_data drives completion status for the period.
  let isEffectivelyCompleted = completed;
  if (frequency === 'daily' || frequency === 'weekly') {
    isEffectivelyCompleted = currentCompletions >= maxCompletions;
  }

  return (
    <Card className={`relative overflow-hidden border-2 border-[#00f0ff] ${!backgroundImage ? 'bg-navy' : ''}`}>
      {backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full z-0"
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
          <PriorityBadge priority={priority} />
          
          {onToggleCompletion && (
            <div className="flex items-center gap-2">
              <PointsBadge points={points} />
              {(frequency === 'daily' || frequency === 'weekly') && frequency_count && frequency_count > 1 && (
                <CompletionCounter 
                  currentCompletions={currentCompletions}
                  maxCompletions={maxCompletions}
                />
              )}
              <CompletionButton 
                completed={isEffectivelyCompleted} // Use effectively completed status for the button
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
          {(frequency === 'daily' || frequency === 'weekly') && (
            <FrequencyTracker 
              frequency={frequency as 'daily' | 'weekly'} // Cast here as FrequencyTracker expects more specific types
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
      
      {isEffectivelyCompleted && (frequency === 'daily' || frequency === 'weekly') && (
        <div className="absolute inset-0 z-20 bg-white/30 rounded pointer-events-none" />
      )}
      {/* For one-time tasks, the simple 'completed' state might be enough if no overlay is desired */}
      {completed && frequency === 'one-time' && (
         <div className="absolute inset-0 z-20 bg-green-500/30 rounded pointer-events-none" />
      )}
    </Card>
  );
};

export default TaskCard;
