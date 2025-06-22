
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { RewardEditorForm } from './reward-editor/RewardEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/lib/logger';
import { Reward, RewardFormValues } from '@/data/rewards/types';

interface RewardEditorProps {
  isOpen: boolean;
  onClose: () => void;
  rewardData?: Reward;
  onSave: (rewardData: RewardFormValues) => Promise<Reward>; 
  onDelete?: (id: string) => void;
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
      logger.debug("RewardEditor opened with data:", rewardData);
      logger.debug("is_dom_reward value in RewardEditor useEffect:", rewardData.is_dom_reward);
    }
  }, [rewardData, isOpen]);
  
  const handleSave = async (formData: RewardFormValues) => {
    logger.debug("RewardEditor handling save with form data:", formData);
    logger.debug("is_dom_reward value in handleSave:", formData.is_dom_reward);
    
    try {
      setIsSaving(true);
      
      // Wait for the save operation to complete
      await onSave(formData);
      
      logger.debug("Save completed successfully");
      
      // Close the modal after successful save
      onClose();
    } catch (error) {
      logger.error("Error in RewardEditor save handler:", error);
      throw error; // Let the centralized error handling manage the toast
    } finally {
      setIsSaving(false);
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
