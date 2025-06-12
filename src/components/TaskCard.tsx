
import React from 'react';
import { Task } from '@/data/tasks/types';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import TaskIcon from '@/components/task/TaskIcon';
import CompletionButton from '@/components/task/CompletionButton';
import PointsBadge from '@/components/task/PointsBadge';
import PriorityBadge from '@/components/task/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  disabled?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onEdit, 
  onToggleComplete, 
  disabled = false 
}) => {
  const backgroundStyle = task.image_meta || task.background_image_url ? {
    position: 'relative' as const,
    overflow: 'hidden' as const,
  } : {};

  const overlayStyle = {
    backgroundColor: `rgba(0, 0, 0, ${(100 - task.background_opacity) / 100})`,
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg bg-navy" style={backgroundStyle}>
      {(task.image_meta || task.background_image_url) && (
        <>
          <div className="absolute inset-0">
            <OptimizedImage
              imageMeta={task.image_meta}
              imageUrl={task.background_image_url}
              alt={`${task.title} background`}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${task.focal_point_x}% ${task.focal_point_y}%`
              }}
            />
          </div>
          <div className="absolute inset-0" style={overlayStyle}></div>
        </>
      )}
      
      <div className="relative p-6 min-h-[200px] flex flex-col justify-between">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {(task.icon_name || task.icon_url) && (
              <TaskIcon
                icon_name={task.icon_name}
                icon_url={task.icon_url}
                icon_color={task.icon_color}
                className="h-8 w-8"
              />
            )}
            <div>
              <h3 
                className={`text-xl font-bold ${task.highlight_effect ? 'bg-yellow-300 bg-opacity-50 px-2 py-1 rounded' : ''}`}
                style={{ color: task.title_color }}
              >
                {task.title}
              </h3>
              {task.description && (
                <p 
                  className={`text-sm mt-1 ${task.highlight_effect ? 'bg-yellow-300 bg-opacity-30 px-2 py-1 rounded' : ''}`}
                  style={{ color: task.subtext_color }}
                >
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
            className="text-white hover:bg-white/10"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <PointsBadge points={task.points} />
            <span className="text-sm" style={{ color: task.subtext_color }}>
              {task.frequency === 'daily' ? 'Daily' : 
               task.frequency === 'weekly' ? `${task.frequency_count}x/week` :
               `${task.frequency_count}x/month`}
            </span>
          </div>
          
          <CompletionButton
            task={task}
            onToggleComplete={onToggleComplete}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
