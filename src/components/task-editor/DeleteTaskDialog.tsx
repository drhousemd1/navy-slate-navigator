
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
}

const DeleteTaskDialog: React.FC<DeleteTaskDialogProps> = ({ isOpen, onOpenChange, onDelete }) => {
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
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-navy border-light-navy text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl">Delete Task</AlertDialogTitle>
          <AlertDialogDescription className="text-white text-sm">
            Are you sure you want to delete this task? This action cannot be undone.
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
