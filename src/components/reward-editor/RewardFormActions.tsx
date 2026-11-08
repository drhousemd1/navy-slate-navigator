import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Save, Loader2 } from 'lucide-react';
import { Reward } from '@/data/rewards/types'; // Changed from RewardWithId to Reward

interface RewardFormActionsProps {
  rewardData?: Reward; // Changed from RewardWithId
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
    <div className="pt-4 w-full flex items-center justify-end space-x-3">
      {rewardData?.id && onDelete && (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
      
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
        className="bg-[#0FA0CE] text-white hover:bg-[#0FA0CE]/90"
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default RewardFormActions;
