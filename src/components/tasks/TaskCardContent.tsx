
import React from 'react';
import { Task } from '@/lib/taskUtils';
import { Button } from '../ui/button';
import { Pencil, CheckCircle2 } from 'lucide-react';

const TaskCardContent = ({
  task,
  onEdit,
  onComplete,
  isCompleted
}: {
  task: Task;
  onEdit: () => void;
  onComplete: () => void;
  isCompleted: boolean;
}) => {
  return (
    <div className="relative z-10 flex flex-col p-4 md:p-6 h-full transition-opacity duration-[2000ms]">
      <h3 className="text-xl font-bold text-white mb-2">{task.title}</h3>
      <p className="text-light-navy text-sm mb-4">{task.description}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-yellow-300 text-lg font-semibold">{task.points} pts</span>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-white border-white" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            onClick={onComplete}
            className={`${isCompleted ? 'bg-green-600' : 'bg-light-navy'} text-white`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {isCompleted ? 'Completed' : 'Complete'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskCardContent;
