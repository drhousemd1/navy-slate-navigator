
import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Check } from 'lucide-react';

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  onEdit: () => void;
  onToggleCompletion?: (completed: boolean) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  points,
  completed = false,
  onEdit,
  onToggleCompletion
}) => {
  return (
    <Card className="bg-navy border-light-navy overflow-hidden">
      <div className="flex items-start p-4 md:p-6">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h3 className={`text-xl font-semibold ${completed ? 'text-gray-400 line-through' : 'text-white'}`}>
              {title}
            </h3>
            {onToggleCompletion && (
              <Button
                variant="outline"
                size="sm"
                className={`ml-auto ${completed ? 'bg-green-600/20 border-green-600/30 text-green-500' : 'bg-navy border-light-navy text-light-navy'}`}
                onClick={() => onToggleCompletion(!completed)}
              >
                {completed ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Completed
                  </span>
                ) : (
                  'Mark Complete'
                )}
              </Button>
            )}
          </div>
          <p className={`mt-2 text-sm ${completed ? 'text-gray-500 line-through' : 'text-light-navy'}`}>
            {description}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="flex items-center">
            <span className="text-nav-active font-bold">{points}</span>
            <span className="text-light-navy text-sm ml-1">pts</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="text-light-navy hover:text-white hover:bg-light-navy"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
