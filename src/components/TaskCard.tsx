
import React, { useState } from 'react';
import { Calendar, Check, CheckSquare, Circle, Edit, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  frequency?: {
    type: 'daily' | 'weekly';
    count: number;
  };
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  icon?: string;
  titleColor?: string;
  subtextColor?: string;
  calendarColor?: string;
  highlighterEffect?: boolean;
}

interface TaskCardProps {
  task: Task;
  onDelete?: () => void;
  onEdit?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onDelete,
  onEdit,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Array of day numbers to display in the tracking section
  const days = Array.from({ length: 10 }, (_, i) => i + 15);

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setDeleteDialogOpen(false);
  };

  const handleEdit = () => {
    console.log("Edit button clicked in TaskCard for task:", task.id); // Enhanced debug log
    if (onEdit) {
      onEdit();
    }
  };

  // Default style values if not set
  const titleColor = task.titleColor || '#FFFFFF';
  const subtextColor = task.subtextColor || '#9CA3AF';
  const calendarColor = task.calendarColor || '#4B5563';
  const backgroundColor = task.backgroundColor || '#1A1F2C';

  return (
    <>
      <Card 
        className="mb-4 overflow-hidden relative" 
        style={{ 
          backgroundColor: backgroundColor,
          backgroundImage: task.backgroundImage ? `url(${task.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid #2D3748'
        }}
      >
        {/* Semi-transparent overlay for background images */}
        {task.backgroundImage && (
          <div 
            className="absolute inset-0 z-0" 
            style={{ 
              backgroundColor: backgroundColor,
              opacity: task.backgroundOpacity || 1
            }}
          />
        )}
        
        <div className="p-4 relative z-10">
          {/* Top row with complete button and points */}
          <div className="flex justify-end items-center mb-4 gap-2">
            {/* Points badge */}
            <Badge className="bg-nav-active hover:bg-nav-active text-white font-medium">
              +{task.points}
            </Badge>
            
            {/* Complete button */}
            <Button 
              variant="outline" 
              className={`rounded-full px-3 py-0.5 h-auto ${task.completed ? 'bg-nav-active text-white border-nav-active' : 'bg-transparent border-light-navy text-nav-inactive'}`}
              size="sm"
            >
              Complete
            </Button>
          </div>
          
          {/* Task info row */}
          <div className="flex items-start mb-3">
            <div className="bg-nav-active/15 p-2 rounded-lg mr-3">
              {task.icon ? (
                <img src={task.icon} alt="Task icon" className="w-6 h-6" />
              ) : (
                <CheckSquare className="w-6 h-6 text-nav-active" />
              )}
            </div>
            <div>
              <h3 
                className={`font-semibold text-lg ${task.highlighterEffect ? 'px-1 py-0.5' : ''}`}
                style={{ 
                  color: titleColor,
                  backgroundColor: task.highlighterEffect ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
                  display: 'inline-block'
                }}
              >
                {task.title}
              </h3>
              <p 
                className={`text-sm ${task.highlighterEffect ? 'px-1 py-0.5' : ''}`}
                style={{ 
                  color: subtextColor,
                  backgroundColor: task.highlighterEffect ? 'rgba(255, 255, 0, 0.2)' : 'transparent',
                  display: 'inline-block'
                }}
              >
                {task.description}
              </p>
            </div>
          </div>
          
          {/* Date tracking section */}
          <div className="flex items-center space-x-1 mt-3">
            <Calendar className="w-4 h-4 mr-1" style={{ color: calendarColor }} />
            {days.map((day) => (
              <div key={day} className="flex flex-col items-center">
                <span className="text-xs mb-1" style={{ color: calendarColor }}>{day}</span>
                <Circle className="w-4 h-4" style={{ color: calendarColor }} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Delete icon button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute bottom-2 right-12 h-8 w-8 p-1.5 bg-navy hover:bg-light-navy text-nav-inactive rounded-full"
          onClick={() => setDeleteDialogOpen(true)}
          type="button"
        >
          <Trash2 className="w-full h-full" />
        </Button>
        
        {/* Edit icon button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute bottom-2 right-2 h-8 w-8 p-1.5 bg-navy hover:bg-light-navy text-nav-inactive rounded-full"
          onClick={handleEdit}
          type="button"
        >
          <Edit className="w-full h-full" />
        </Button>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-navy border-light-navy text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-nav-inactive">
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dark-navy text-white border-light-navy hover:bg-light-navy">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskCard;
