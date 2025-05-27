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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  taskName?: string; // Added taskName prop
}

const DeleteTaskDialog: React.FC<DeleteTaskDialogProps> = ({ isOpen, onOpenChange, onDelete, taskName }) => {
  const handleDelete = () => {
    onDelete();
    onOpenChange(false); // Explicitly close the dialog after delete
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button 
          type="button" 
          variant="destructive" 
          className="bg-red-700 text-white hover:bg-red-600 flex items-center gap-2"
          // This button is now only part of TaskEditorForm, so no need for it to be here as a trigger
          // This component is used directly by TaskEditorForm now, not as a self-triggering dialog
          // We can remove the AlertDialogTrigger from here if it's always controlled externally.
          // For now, keeping it as is, but the usage in TaskEditorForm already handles opening.
          // The error was in TaskEditorForm passing taskName, this component now accepts it.
        >
          <Trash2 className="h-4 w-4" />
          Delete {/* This button text is not actually shown if used as in TaskEditorForm */}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-navy border-light-navy text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl">Delete Task</AlertDialogTitle>
          <AlertDialogDescription className="text-white text-sm">
            Are you sure you want to delete {taskName || 'this task'}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-light-navy text-white hover:bg-light-navy">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-red-700 text-white hover:bg-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTaskDialog;
