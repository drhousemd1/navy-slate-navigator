
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

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
    <div className="pt-4 w-full flex items-center justify-end gap-3">
      {rewardData?.id && onDelete && (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="bg-red-700 text-white hover:bg-red-600 flex items-center gap-2"
          disabled={isSaving}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}
      <Button 
        type="button" 
        variant="destructive" 
        onClick={onCancel}
        className="bg-red-700 text-white hover:bg-red-600"
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        className="bg-nav-active text-white hover:bg-nav-active/90"
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};

export default RewardFormActions;
