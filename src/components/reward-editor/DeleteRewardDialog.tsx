
import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
      <AlertDialogContent className="bg-navy border-light-navy text-white max-w-md">
        <div className="flex flex-col items-center text-center px-4 py-6">
          <AlertDialogHeader className="mb-6">
            <AlertDialogTitle className="text-white text-2xl font-bold">
              Delete Reward
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white mt-4">
              {rewardName ? 
                `Are you sure you want to delete "${rewardName}"? This action cannot be undone.` : 
                "Are you sure you want to delete this reward? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex justify-center gap-6 w-full mt-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-transparent border border-slate-700 text-white hover:bg-slate-800 w-36 h-12 rounded-md"
            >
              Cancel
            </Button>
            <Button 
              onClick={onConfirm} 
              className="bg-red-700 text-white hover:bg-red-600 w-36 h-12 rounded-md"
            >
              Delete
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteRewardDialog;
