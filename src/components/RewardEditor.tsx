import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { RewardEditorForm } from './reward-editor/RewardEditorForm';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/lib/logger';

interface RewardEditorProps {
  isOpen: boolean;
  onClose: () => void;
  rewardData?: any;
  onSave: (rewardData: any) => Promise<any> | void; // Updated to allow any return type
  onDelete?: (id: string) => void; // Changed from number to string
}

const RewardEditor: React.FC<RewardEditorProps> = ({ 
  isOpen, 
  onClose, 
  rewardData, 
  onSave,
  onDelete
}) => {
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (rewardData) {
      logger.log("RewardEditor opened with data:", rewardData);
      logger.log("is_dom_reward value in RewardEditor useEffect:", rewardData.is_dom_reward);
    }
  }, [rewardData, isOpen]);
  
  const handleSave = async (formData: any) => {
    logger.log("RewardEditor handling save with form data:", formData);
    logger.log("is_dom_reward value in handleSave:", formData.is_dom_reward);
    
    try {
      setIsSaving(true);
      
      const dataToSave = rewardData ? { 
        ...formData, 
        id: rewardData.id,
        is_dom_reward: Boolean(formData.is_dom_reward) // Ensure proper boolean conversion
      } : formData;
      
      logger.log("Final data being sent to save:", dataToSave);
      logger.log("Final is_dom_reward value:", dataToSave.is_dom_reward);
      
      // Show optimistic toast immediately
      toast({
        title: "Saving",
        description: "Your reward is being saved...",
      });
      
      // Close the modal immediately to improve perceived performance
      onClose();
      
      // Process the save in the background
      setTimeout(async () => {
        try {
          // Use await instead of .then to properly handle the Promise
          await onSave(dataToSave);
          logger.log("Save completed successfully");
        } catch (error) {
          logger.error("Error in RewardEditor save handler:", error);
          toast({
            title: "Error",
            description: "Failed to save reward. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSaving(false);
        }
      }, 0);
    } catch (error) {
      logger.error("Error in RewardEditor save handler:", error);
      setIsSaving(false);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[100vh] bg-navy border-light-navy pt-10 px-0 overflow-y-auto">
          <div className="px-4">
            <SheetHeader className="text-center mb-6">
              <SheetTitle className="text-2xl font-bold text-white">
                {rewardData ? 'Edit Reward' : 'Create New Reward'}
              </SheetTitle>
              <SheetDescription className="text-light-navy">
                {rewardData ? 'Modify the existing reward' : 'Create a new reward to redeem'}
              </SheetDescription>
            </SheetHeader>
            
            <RewardEditorForm
              rewardData={rewardData}
              onSave={handleSave}
              onCancel={onClose}
              onDelete={onDelete}
              isSaving={isSaving}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] bg-navy border-light-navy text-white overflow-y-auto">
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
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RewardEditor;
