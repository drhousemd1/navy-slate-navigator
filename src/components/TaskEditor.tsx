import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Task } from '@/data/tasks/types'; // Updated import path for Task
import TaskEditorForm from './TaskEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  taskData?: Partial<Task>; // Uses the imported Task type
  onSave: (taskData: any) => void; // Consider using a more specific type for taskData if possible
  onDelete?: (taskId: string) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ 
  isOpen, 
  onClose, 
  taskData, 
  onSave, 
  onDelete 
}) => {
  const isMobile = useIsMobile();
  
  const handleSave = async (formData: any) => {
    await onSave(formData);
    onClose(); 
  };

  const handleDelete = (taskId: string) => {
    if (onDelete && taskData?.id) { // ensure taskData and id exist for delete
      onDelete(taskData.id); // Pass the actual task ID
      onClose(); // Close editor after delete action
    } else if (onDelete && !taskData?.id) {
      console.warn("TaskEditor: handleDelete called without a task ID in taskData.");
      // Optionally, still close or provide feedback
      onClose();
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[100vh] bg-navy border-light-navy pt-10 px-0 overflow-y-auto">
          <div className="px-4">
            <SheetHeader className="text-center mb-6">
              <SheetTitle className="text-2xl font-bold text-white">
                {taskData?.id ? 'Edit Task' : 'Create New Task'}
              </SheetTitle>
              <SheetDescription className="text-light-navy">
                {taskData?.id ? 'Modify the existing task' : 'Create a new task to track'}
              </SheetDescription>
            </SheetHeader>
            
            <TaskEditorForm
              taskData={taskData}
              onSave={handleSave}
              onDelete={taskData?.id ? handleDelete : undefined} // Pass handleDelete only if taskData.id exists
              onCancel={onClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] bg-navy border-light-navy text-white overflow-y-auto">
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
          onDelete={taskData?.id ? handleDelete : undefined} // Pass handleDelete only if taskData.id exists
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;
