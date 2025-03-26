
import React from 'react';
import { Button } from "@/components/ui/button";
import { Save, Trash2 } from 'lucide-react';
import DeleteRewardDialog from './DeleteRewardDialog';

interface RewardFormActionsProps {
  rewardData?: any;
  loading: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
  onCancel: () => void;
  onDelete?: (index: number) => void;
}

const RewardFormActions: React.FC<RewardFormActionsProps> = ({
  rewardData,
  loading,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete
}) => {
  const handleDelete = () => {
    console.log("Delete button clicked for reward:", rewardData);
    if (rewardData && onDelete) {
      // We need to pass the index, not the ID
      onDelete(rewardData.index);
    }
  };

  return (
    <div className="flex justify-end space-x-4 pt-4">
      {rewardData && onDelete && (
        <DeleteRewardDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          rewardName={rewardData.title}
        />
      )}
      
      <div className="flex space-x-4">
        {rewardData && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              console.log("Opening delete dialog for reward:", rewardData);
              setIsDeleteDialogOpen(true);
            }}
            disabled={loading}
            className="bg-red-700 hover:bg-red-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
        
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="bg-red-700 text-white hover:bg-red-600 border-0"
        >
          Cancel
        </Button>
        
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-cyan-500 text-white hover:bg-cyan-400 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default RewardFormActions;
