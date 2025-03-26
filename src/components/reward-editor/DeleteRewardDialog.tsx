
import React from 'react';
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

interface DeleteRewardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  rewardName?: string;
}

const DeleteRewardDialog: React.FC<DeleteRewardDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  rewardName 
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-navy border-light-navy text-white">
        <AlertDialogHeader className="mb-4">
          <AlertDialogTitle className="text-white text-xl">Delete Reward</AlertDialogTitle>
          <AlertDialogDescription className="text-white text-sm">
            {rewardName ? 
              `Are you sure you want to delete "${rewardName}"? This action cannot be undone.` : 
              "Are you sure you want to delete this reward? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex justify-center items-center w-full mt-4 mb-2 gap-4">
          <AlertDialogCancel className="bg-transparent border border-light-navy text-white hover:bg-light-navy w-24 h-10">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-red-700 text-white hover:bg-red-600 w-24 h-10"
          >
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteRewardDialog;
