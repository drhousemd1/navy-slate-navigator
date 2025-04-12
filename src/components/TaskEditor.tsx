
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Task } from '@/lib/taskUtils';
import TaskEditorForm from './task-editor/TaskEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  taskData?: Partial<Task>;
  onSave: (taskData: any) => void;
  onDelete?: (taskId: string) => void;
  updateCarouselTimer?: (newTime: number) => void;
  sharedImageIndex?: number;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ 
  isOpen, 
  onClose, 
  taskData, 
  onSave, 
  onDelete,
  updateCarouselTimer,
  sharedImageIndex = 0
}) => {
  const isMobile = useIsMobile();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleSave = async (formData: any) => {
    await onSave(formData);
    onClose();
  };

  const handleDelete = (taskId: string) => {
    if (onDelete) {
      onDelete(taskId);
      onClose(); 
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="bg-navy border-light-navy text-white overflow-y-auto max-h-[90vh]"
          ref={containerRef}
        >
          <SheetHeader>
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
            onDelete={handleDelete}
            onCancel={onClose}
            updateCarouselTimer={updateCarouselTimer}
            sharedImageIndex={sharedImageIndex}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-navy border-light-navy text-white max-h-[90vh] overflow-y-auto"
        ref={containerRef}
      >
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
          sharedImageIndex={sharedImageIndex}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;
