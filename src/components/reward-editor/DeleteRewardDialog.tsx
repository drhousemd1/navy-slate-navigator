
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
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl">Delete Reward</AlertDialogTitle>
          <AlertDialogDescription className="text-white text-sm">
            {rewardName ? 
              `Are you sure you want to delete "${rewardName}"? This action cannot be undone.` : 
              "Are you sure you want to delete this reward? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end space-x-4 mt-6">
          <AlertDialogCancel className="bg-transparent border-light-navy text-white hover:bg-light-navy">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-red-700 text-white hover:bg-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteRewardDialog;
