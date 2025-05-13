
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';

interface RewardFormActionsProps {
  rewardData?: any;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

const RewardFormActions: React.FC<RewardFormActionsProps> = ({
  rewardData,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete,
  isSaving = false
}) => {
  return (
    <div className="pt-4 w-full flex items-center justify-between">
      {rewardData?.id && onDelete && (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
          disabled={isSaving}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}
      <div className="flex items-center gap-3 ml-auto">
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onCancel}
          className="bg-red-600 text-white hover:bg-red-700"
          disabled={isSaving}
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
  );
};

export default RewardFormActions;
