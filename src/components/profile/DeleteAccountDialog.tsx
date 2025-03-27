
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
  type: 'delete' | 'unlink';
}

export function DeleteAccountDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
}: DeleteAccountDialogProps) {
  const isDelete = type === 'delete';
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-navy border-light-navy">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            {isDelete ? 'Delete Account' : 'Unlink Account'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            {isDelete 
              ? 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.'
              : 'Are you sure you want to unlink from your partner? Your account data will be preserved, but changes will no longer sync with your partner.'}
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
            {isDelete ? 'Delete Account' : 'Unlink Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
