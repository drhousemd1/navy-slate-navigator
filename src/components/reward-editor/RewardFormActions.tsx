
import React from 'react';
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import DeleteRewardDialog from './DeleteRewardDialog';

interface RewardFormActionsProps {
  rewardData: any;
  loading: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCancel: () => void;
  onDelete?: () => void;
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
    <div className="pt-4 w-full flex items-center justify-end gap-3">
      {rewardData && onDelete && (
        <DeleteRewardDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onDelete={onDelete}
        />
      )}
      <Button 
        type="button" 
        variant="destructive" 
        onClick={onCancel}
        className="bg-red-700 border-light-navy text-white hover:bg-red-600"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2"
        disabled={loading}
      >
        {loading ? 'Saving...' : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default RewardFormActions;
