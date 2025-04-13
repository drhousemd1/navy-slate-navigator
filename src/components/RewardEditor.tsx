
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RewardEditorForm from './reward-editor/RewardEditorForm';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/lib/rewardUtils';

interface RewardEditorProps {
  reward: Reward;
  onClose: () => void;
  globalCarouselTimer: NodeJS.Timeout | null;
  onSave: (rewardData: any, index: number | null) => Promise<Reward | null>;
  onDelete: (index: number) => Promise<boolean>;
}

const RewardEditor: React.FC<RewardEditorProps> = ({ 
  reward, 
  onClose, 
  globalCarouselTimer,
  onSave,
  onDelete
}) => {
  const queryClient = useQueryClient();
  
  const handleSave = async (formData: any) => {
    console.log("RewardEditor handling save with form data:", formData);
    try {
      // For existing rewards, pass the existing ID along with the form data
      const dataToSave = { ...formData, id: reward.id };
      
      // Find the index of the reward in the rewards array
      const rewardIndex = queryClient.getQueryData<Reward[]>(['rewards'])?.findIndex(r => r.id === reward.id) || 0;
      
      await onSave(dataToSave, rewardIndex);
      
      // Force a rewards data refresh after saving
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      
      toast({
        title: "Success",
        description: "Reward saved successfully",
      });
      
      // Important: Close the dialog after successful save
      onClose();
    } catch (error) {
      console.error("Error in RewardEditor save handler:", error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
      // Don't close dialog if save failed
    }
  };

  return (
    <Dialog 
      open={!!reward} 
      onOpenChange={(open) => {
        if (!open) {
          console.log("Dialog closing via onOpenChange");
          onClose();
        }
      }}
    >
      <DialogContent className="bg-navy border-light-navy text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Edit Reward
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            Modify the existing reward
          </DialogDescription>
        </DialogHeader>
        
        <RewardEditorForm
          reward={reward}
          onSave={handleSave}
          onCancel={onClose}
          onDelete={onDelete}
          globalCarouselTimer={globalCarouselTimer}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RewardEditor;
