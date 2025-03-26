
import React from 'react';
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
  const handleSave = async (formData: any) => {
    // Preserve any existing fields that might not be captured in the form
    const dataToSave = {
      ...formData,
      // Make sure we're capturing all the fields we need for display
      highlight_effect: formData.highlight_effect ?? rewardData?.highlight_effect,
      title_color: formData.title_color ?? rewardData?.title_color,
      subtext_color: formData.subtext_color ?? rewardData?.subtext_color,
      calendar_color: formData.calendar_color ?? rewardData?.calendar_color
    };
    
    await onSave(dataToSave);
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
