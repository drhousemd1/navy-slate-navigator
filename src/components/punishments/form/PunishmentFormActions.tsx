
import React from 'react';
import { Button } from '@/components/ui/button';
import { PunishmentData } from '@/contexts/punishments/types';
import { Loader2, Trash2, Save } from 'lucide-react';
import DeletePunishmentDialog from '../DeletePunishmentDialog';

interface PunishmentFormActionsProps {
  punishmentData?: PunishmentData;
  isSaving?: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const PunishmentFormActions: React.FC<PunishmentFormActionsProps> = ({
  punishmentData,
  isSaving = false,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete
}) => {
  return (
    <div className="flex flex-col space-y-4 mt-6 md:mt-8">
      <div className="flex items-center justify-end space-x-3 pt-4">
        {punishmentData?.id && onDelete && (
          <Button 
            type="button" 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
        
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onCancel}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Cancel
        </Button>
        
        <Button 
          type="submit"
          className="bg-[#0FA0CE] text-white hover:bg-[#0FA0CE]/90"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
      
      {punishmentData?.id && onDelete && (
        <DeletePunishmentDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onDelete={() => {
            if (punishmentData?.id && onDelete) {
              onDelete(punishmentData.id);
            }
          }}
          punishmentName={punishmentData.title}
        />
      )}
    </div>
  );
};

export default PunishmentFormActions;
