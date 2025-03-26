
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RewardEditorForm from './reward-editor/RewardEditorForm';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

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
  const queryClient = useQueryClient();
  
  const handleSave = async (formData: any) => {
    console.log("RewardEditor handling save with form data:", formData);
    try {
      await onSave(formData);
      // Force a rewards data refresh after saving
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Success",
        description: "Reward saved successfully",
      });
      onClose();
    } catch (error) {
      console.error("Error in RewardEditor save handler:", error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
      // Don't close dialog if save failed
      return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        console.log("Dialog closing via onOpenChange");
        onClose();
      }
    }}>
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
