
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

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAccountDialog({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-navy border-light-navy">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Account</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onClose}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-gray-600 text-white hover:bg-gray-700"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
