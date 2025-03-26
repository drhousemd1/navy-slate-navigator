
import React from 'react';
import { Button } from "@/components/ui/button";
import DeleteRewardDialog from './DeleteRewardDialog';

interface RewardFormActionsProps {
  rewardData?: any;
  loading: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
  onCancel: () => void;
  onDelete?: (id: number) => void;
}

const RewardFormActions: React.FC<RewardFormActionsProps> = ({
  rewardData,
  loading,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete
}) => {
  return (
    <div className="flex justify-between space-x-4 pt-4">
      <div>
        {rewardData && onDelete && (
          <>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={loading}
            >
              Delete
            </Button>
            <DeleteRewardDialog
              isOpen={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              onConfirm={() => onDelete(rewardData.id || rewardData.index)}
              rewardName={rewardData.title}
            />
          </>
        )}
      </div>
      <div className="space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};

export default RewardFormActions;
