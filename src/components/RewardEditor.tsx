
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RewardEditorForm from './reward-editor/RewardEditorForm';

interface RewardEditorProps {
  isOpen: boolean;
  onClose: () => void;
  rewardData?: any;
  onSave: (rewardData: any) => void;
  onDelete?: (id: number) => void;
}

const RewardEditor: React.FC<RewardEditorProps> = ({ 
  isOpen, 
  onClose, 
  rewardData, 
  onSave,
  onDelete
}) => {
  // For debugging
  useEffect(() => {
    if (rewardData) {
      console.log("RewardEditor received data:", rewardData);
    }
  }, [rewardData]);

  const handleSave = async (formData: any) => {
    console.log("RewardEditor saving form data:", formData);
    
    // Preserve all fields from the original rewardData
    const mergedData = rewardData 
      ? { ...rewardData, ...formData } 
      : formData;
    
    console.log("Merged data to save:", mergedData);
    await onSave(mergedData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {rewardData ? 'Edit Reward' : 'Create New Reward'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {rewardData ? 'Modify the existing reward' : 'Create a new reward to redeem'}
          </DialogDescription>
        </DialogHeader>
        
        <RewardEditorForm
          rewardData={rewardData}
          onSave={handleSave}
          onCancel={onClose}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RewardEditor;
