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
import { Button } from "@/components/ui/button";

interface DeleteAvatarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteAvatarDialog: React.FC<DeleteAvatarDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const isLightScheme = useColorScheme().currentScheme === 'light-turquoise';
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-navy border-light-navy">
        <AlertDialogHeader>
          <AlertDialogTitle className={isLightScheme ? 'text-foreground' : 'text-white'}>Delete Profile Image?</AlertDialogTitle>
          <AlertDialogDescription className={isLightScheme ? 'text-foreground' : undefined}>
            This will remove your profile image. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row justify-center gap-4 w-full">
          <AlertDialogCancel 
            onClick={onClose}
            className={`bg-light-navy ${isLightScheme ? 'text-foreground hover:text-white' : 'text-white'} hover:bg-gray-700`}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
