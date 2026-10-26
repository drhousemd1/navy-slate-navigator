
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
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteRuleDialogProps {
  isOpen: boolean;
  preserveHistory?: boolean;
  isDeleting?: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: () => void;
  ruleName?: string;
}

const DeleteRuleDialog: React.FC<DeleteRuleDialogProps> = ({
  isOpen, preserveHistory = false, isDeleting = false,
  onOpenChange,
  onDelete,
  ruleName,
}) => {
  return (
    <>
      <Button 
        type="button"
        disabled={isDeleting}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(true);
        }} 
        variant="destructive"
        className="bg-red-700 border-light-navy text-white hover:bg-red-600 flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" /> Delete Rule
      </Button>
      
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent 
          className="bg-navy border-light-navy"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {ruleName ? `the rule "${ruleName}"` : 'this rule'}? {preserveHistory ? 'Past activity and Undo records will remain in History.' : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isDeleting}
              className="bg-dark-navy text-white border-light-navy hover:bg-light-navy"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="bg-red-700 text-white hover:bg-red-600"
            >
              {isDeleting ? 'Removing…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeleteRuleDialog;
