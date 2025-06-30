
import React from 'react';
import { Button } from '@/components/ui/button';
import { Task } from '@/lib/taskUtils';
import { Loader2, Trash2, Save } from 'lucide-react';
import DeleteTaskDialog from './DeleteTaskDialog';

interface TaskFormActionsProps {
  taskData?: Partial<Task>;
  isSaving?: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCancel: () => void;
  onDelete?: () => void;
}

const TaskFormActions: React.FC<TaskFormActionsProps> = ({
  taskData,
  isSaving = false,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete
}) => {
  return (
    <div className="flex flex-col space-y-4 mt-6 md:mt-8">
      <div className="flex items-center justify-end space-x-3 pt-4">
        {taskData?.id && onDelete && (
          <DeleteTaskDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDelete={onDelete}
            taskName={taskData?.title || 'this task'}
          />
        )}
        
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onCancel} 
          className="bg-red-700 border-light-navy text-white hover:bg-red-600"
        >
          Cancel
        </Button>
        
        <Button 
          type="submit" 
          className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TaskFormActions;
