
import React from 'react';
import { Button } from '@/components/ui/button';
import { PunishmentData } from '@/contexts/punishments/types';
import { Loader2, Trash2 } from 'lucide-react';
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
      <div className="flex justify-between items-center pt-4">
        {punishmentData?.id && onDelete && (
          <Button 
            type="button" 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="mr-auto bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
        
        <div className="flex space-x-4 ml-auto">
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
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
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
