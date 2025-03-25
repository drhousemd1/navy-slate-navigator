
import React, { useState } from 'react';
import { Calendar, CheckSquare, Circle, Edit, Trash2 } from 'lucide-react';
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

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  onDelete?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  points,
  completed = false,
  onDelete,
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

  return (
    <>
      <Card className="bg-navy border border-light-navy mb-4 overflow-hidden relative">
        <div className="p-4">
          {/* Top row with complete button and points */}
          <div className="flex justify-end items-center mb-4 gap-2">
            {/* Points badge */}
            <Badge className="bg-nav-active hover:bg-nav-active text-white font-medium">
              +{points}
            </Badge>
            
            {/* Complete button - removed check icon and adjusted padding */}
            <Button 
              variant="outline" 
              className={`rounded-full px-3 py-0.5 h-auto ${completed ? 'bg-nav-active text-white border-nav-active' : 'bg-transparent border-light-navy text-nav-inactive'}`}
              size="sm"
            >
              Complete
            </Button>
          </div>
          
          {/* Task info row */}
          <div className="flex items-start mb-3">
            <div className="bg-nav-active/15 p-2 rounded-lg mr-3">
              <CheckSquare className="w-6 h-6 text-nav-active" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{title}</h3>
              <p className="text-nav-inactive text-sm">{description}</p>
            </div>
          </div>
          
          {/* Date tracking section */}
          <div className="flex items-center space-x-1 mt-3">
            <Calendar className="w-4 h-4 text-nav-inactive mr-1" />
            {days.map((day) => (
              <div key={day} className="flex flex-col items-center">
                <span className="text-xs text-nav-inactive mb-1">{day}</span>
                <Circle className="w-4 h-4 text-light-navy" />
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
        >
          <Trash2 className="w-full h-full" />
        </Button>
        
        {/* Edit icon button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute bottom-2 right-2 h-8 w-8 p-1.5 bg-navy hover:bg-light-navy text-nav-inactive rounded-full"
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
