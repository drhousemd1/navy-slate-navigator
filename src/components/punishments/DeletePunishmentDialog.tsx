import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeletePunishmentDialogProps {
  isOpen: boolean;
  preserveHistory?: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void | Promise<void>;
  punishmentName?: string;
}

const DeletePunishmentDialog: React.FC<DeletePunishmentDialogProps> = ({
  isOpen, preserveHistory = false,
  onOpenChange,
  onDelete,
  punishmentName
}) => {
  const text = useCoreTextClasses();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    if (deleting) return;
    setDeleting(true); setError(null);
    try { await onDelete(); onOpenChange(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Removal was not confirmed. Please retry.'); }
    finally { setDeleting(false); }
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`bg-navy border-light-navy ${text.primary} max-w-md`}>
        <div className="flex flex-col items-center text-center px-4 py-6">
          <AlertDialogHeader className="mb-6">
            <AlertDialogTitle className={`${text.primary} text-2xl font-bold`}>
              Delete Punishment
            </AlertDialogTitle>
            <AlertDialogDescription className={`${text.primary} mt-4`}>
              {punishmentName ? 
                `Are you sure you want to delete "${punishmentName}"? This action cannot be undone.` : 
                "Are you sure you want to delete this punishment? This action cannot be undone."}
              {preserveHistory && <span className="block mt-2">Past activity, points and Undo records remain in History.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {error && <p role="alert" className={`${text.danger} mb-3`}>{error}</p>}
          <div className="flex justify-center gap-6 w-full mt-2">
            <Button
              onClick={() => onOpenChange(false)}
              disabled={deleting}
              className={`bg-transparent border border-slate-700 ${text.primary} hover:bg-slate-800 w-36 h-12 rounded-md hover:text-white`}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => void remove()}
              disabled={deleting}
              className="bg-red-700 text-white hover:bg-red-600 w-36 h-12 rounded-md"
            >
              {deleting ? 'Removing…' : 'Delete'}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePunishmentDialog;
