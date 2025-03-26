
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
    // Make sure we're preserving the ID and any other fields that shouldn't be changed
    const dataToSave = {
      ...(rewardData || {}), // Start with all existing data
      ...formData,           // Override with new form data
      id: rewardData?.id,    // Ensure ID is preserved
      // Make sure we're explicitly capturing all the fields we need
      title: formData.title,
      description: formData.description,
      cost: formData.cost,
      supply: rewardData?.supply || 0,
      iconName: formData.icon_name || formData.iconName,
      icon_color: formData.icon_color,
      background_image_url: formData.background_image_url,
      background_opacity: formData.background_opacity,
      focal_point_x: formData.focal_point_x,
      focal_point_y: formData.focal_point_y,
      highlight_effect: formData.highlight_effect,
      title_color: formData.title_color,
      subtext_color: formData.subtext_color,
      calendar_color: formData.calendar_color
    };
    
    console.log('Saving reward data:', dataToSave);
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
