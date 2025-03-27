
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
            className="bg-transparent text-white border-gray-600 hover:bg-gray-800"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isDelete ? "bg-red-600 text-white hover:bg-red-700" : "bg-cyan-600 text-white hover:bg-cyan-700"}
          >
            {isDelete ? 'Delete Account' : 'Unlink Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
