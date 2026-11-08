
import React from 'react';
import type { TaskProgress } from '@/domain/actions/types';
import { taskDayIndex } from '@/data/tasks/actionReadModel';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import PriorityBadge from './task/PriorityBadge';
import PointsBadge from './task/PointsBadge';
import CompletionButton from './task/CompletionButton';
import CompletionCounter from './task/CompletionCounter';
import TaskIcon from './task/TaskIcon';
import FrequencyTracker from './task/FrequencyTracker';
import HighlightedText from './task/HighlightedText';
import { getCurrentDayOfWeek } from '@/lib/taskUtils';

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  onEdit?: () => void;
  atomic?: boolean;
  progress?: TaskProgress;
  progressError?: string;
  actionDisabled?: boolean;
  onToggleCompletion?: (completed: boolean) => void;
  onDelete?: () => void;
  frequency?: 'once' | 'daily' | 'weekly';
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
  is_dom_task?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  atomic = false, progress, progressError, actionDisabled = false,
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
  icon_color = '#9b87f5',
  is_dom_task = false
}) => {
  const currentDayOfWeek = atomic && progress ? taskDayIndex(progress) : getCurrentDayOfWeek();
  const currentCompletions = atomic ? progress?.currentCount ?? 0 : usage_data[currentDayOfWeek] || 0;
  const maxCompletions = atomic ? progress?.target ?? frequency_count : frequency_count || 1;
  const isFullyCompleted = atomic ? !!progress?.completed : currentCompletions >= maxCompletions;

  return (
    <Card className={`relative overflow-hidden border-2 ${is_dom_task ? 'border-red-500' : 'border-cyan-400'} ${!backgroundImage ? 'bg-card' : ''}`}>
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
          {atomic && progress?.mandatory ? <div className="flex items-center gap-2">
            <PriorityBadge priority={priority} />
            <Badge className="text-white font-medium" style={{ backgroundColor: '#000000', borderColor: is_dom_task ? '#ff0000' : '#00f0ff', borderWidth: '1px' }}>Mandatory</Badge>
          </div> : <PriorityBadge priority={priority} />}
          
          {onToggleCompletion && (
            <div className="flex items-center gap-2">
              <PointsBadge points={points} isDomTask={is_dom_task} />
              {(!atomic || progress) ? <CompletionCounter
                currentCompletions={currentCompletions}
                maxCompletions={maxCompletions}
                isDomTask={is_dom_task}
              /> : <span aria-label="Task progress unavailable">—</span>}
              <CompletionButton 
                disabled={actionDisabled || (atomic && !progress)}
                completed={atomic ? !!progress?.completed : completed}
                onToggleCompletion={onToggleCompletion}
                currentCompletions={currentCompletions}
                maxCompletions={maxCompletions}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${is_dom_task ? 'bg-red-500' : 'bg-cyan-400'}`}>
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
          {frequency && (!atomic || progress) && (
            <FrequencyTracker 
              frequency={atomic ? progress.frequency : frequency}
              frequency_count={atomic ? progress.target : frequency_count}
              calendar_color={calendar_color}
              usage_data={atomic ? [...progress.usageData] : usage_data}
              currentDay={atomic ? currentDayOfWeek : undefined}
            />
          )}
          
          <div className="flex space-x-2 ml-auto">
            {onEdit && <Button
              aria-label={`Edit ${title}`}
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Edit className="h-4 w-4" />
            </Button>}
          </div>
        </div>
        {atomic && progress?.dueAt && <p className="mt-2 text-sm text-white">
          <time dateTime={progress.dueAt} title={progress.timeZone}>Due {new Intl.DateTimeFormat('en', { timeZone: progress.timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(progress.dueAt))}</time>
          {progress.overdue && <span className="ml-2 font-semibold">Overdue</span>}
        </p>}
        {progressError && <p className="mt-2 text-sm text-amber-300">{progressError}</p>}
      </div>
      
      {isFullyCompleted && (
        <div className="absolute inset-0 z-20 bg-white/30 rounded pointer-events-none" />
      )}
    </Card>
  );
};

export default TaskCard;
