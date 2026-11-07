import { useColorScheme } from '@/contexts/ColorSchemeContext';

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
  const isLightScheme = useColorScheme().currentScheme === 'light-turquoise';
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-navy border-light-navy">
        <AlertDialogHeader>
          <AlertDialogTitle className={isLightScheme ? 'text-foreground' : 'text-white'}>
            {isDelete ? 'Delete Account' : 'Unlink Account'}
          </AlertDialogTitle>
          <AlertDialogDescription className={isLightScheme ? 'text-foreground' : 'text-gray-300'}>
            {isDelete 
              ? 'Delete your account and private account data permanently? This cannot be undone. Shared messages, photos and recorded history may remain with the other person, with your profile shown as “Deleted account”. Text you wrote is not automatically anonymized. Keep this browser’s site data until deletion and device cleanup are confirmed.'
              : 'Are you sure you want to unlink from your partner? Your account data will be preserved, but changes will no longer sync with your partner.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className={`bg-transparent ${isLightScheme ? 'text-foreground hover:text-white' : 'text-white'} border-gray-600 hover:bg-gray-800`}
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
