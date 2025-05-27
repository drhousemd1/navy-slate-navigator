
    import React from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
    import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
    import { Task } from '@/lib/taskUtils';
    import TaskEditorForm from './TaskEditorForm';
    import { useIsMobile } from '@/hooks/use-mobile';
    import { TaskFormValues } from '@/data/tasks/types'; // Import TaskFormValues

    interface TaskEditorProps {
      isOpen: boolean;
      onClose: () => void;
      taskData?: Partial<Task>; // Keep Partial<Task> for initial data
      onSave: (taskData: TaskFormValues) => Promise<void>; // Use TaskFormValues for saving
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
      
      const handleSave = async (formData: TaskFormValues) => { // formData is TaskFormValues
        await onSave(formData);
        // onClose(); // onClose is called within TaskEditorForm or after onSave promise resolves in parent
      };

      const handleDelete = (taskId: string) => {
        if (onDelete) {
          onDelete(taskId);
          // onClose(); // onClose is called within TaskEditorForm or after onDelete promise resolves in parent
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
                  onSave={handleSave} // handleSave now expects TaskFormValues
                  onDelete={handleDelete}
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
              onSave={handleSave} // handleSave now expects TaskFormValues
              onDelete={handleDelete}
              onCancel={onClose}
            />
          </DialogContent>
        </Dialog>
      );
    };

    export default TaskEditor;

    