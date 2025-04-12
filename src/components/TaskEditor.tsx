
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Task } from '@/lib/taskUtils';
import TaskEditorForm from './task-editor/TaskEditorForm';

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  taskData?: Partial<Task>;
  onSave: (taskData: any) => void;
  onDelete?: (taskId: string) => void;
  updateCarouselTimer?: (newTime: number) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ 
  isOpen, 
  onClose, 
  taskData, 
  onSave, 
  onDelete,
  updateCarouselTimer
}) => {
  const handleSave = async (formData: any) => {
    await onSave(formData);
    onClose();
  };

  const handleDelete = (taskId: string) => {
    if (onDelete) {
      onDelete(taskId);
      onClose(); // Ensure modal closes after deletion
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {taskData?.id ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {taskData?.id ? 'Modify the existing task' : 'Create a new task to track'}
          </DialogDescription>
        </DialogHeader>
        
        <TaskEditorForm
          taskData={taskData}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={onClose}
          updateCarouselTimer={updateCarouselTimer}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;
