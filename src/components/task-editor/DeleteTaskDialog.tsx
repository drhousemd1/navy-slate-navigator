
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  taskName?: string;
}

const DeleteTaskDialog: React.FC<DeleteTaskDialogProps> = ({ isOpen, onOpenChange, onDelete, taskName }) => {
  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <>
      <Button 
        onClick={() => onOpenChange(true)} 
        variant="destructive"
        className="bg-red-700 border-light-navy text-white hover:bg-red-600 flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" /> Delete Task
      </Button>
      
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-navy border-light-navy">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {taskName ? `the task "${taskName}"` : 'this task'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dark-navy text-white border-light-navy hover:bg-light-navy">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-700 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeleteTaskDialog;
