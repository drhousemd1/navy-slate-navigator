
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { PunishmentData } from '@/contexts/PunishmentsContext';
import DeletePunishmentDialog from '../DeletePunishmentDialog';

interface PunishmentFormActionsProps {
  punishmentData?: PunishmentData;
  loading: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const PunishmentFormActions: React.FC<PunishmentFormActionsProps> = ({
  punishmentData,
  loading,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete
}) => {
  return (
    <div className="pt-4 w-full flex items-center justify-end gap-3">
      {punishmentData?.id && onDelete && (
        <>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={loading}
            className="bg-red-700 text-white hover:bg-red-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <DeletePunishmentDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onDelete={() => onDelete(punishmentData.id as string)}
            punishmentName={punishmentData.title}
          />
        </>
      )}
      <Button 
        type="button" 
        variant="destructive" 
        onClick={onCancel}
        disabled={loading}
        className="bg-red-700 text-white hover:bg-red-600"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default PunishmentFormActions;
