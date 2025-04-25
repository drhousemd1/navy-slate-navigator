
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { RewardEditorForm } from './reward-editor/RewardEditorForm';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async (formData: any) => {
    console.log("RewardEditor handling save with form data:", formData);
    try {
      setIsSaving(true);
      const dataToSave = rewardData ? { ...formData, id: rewardData.id } : formData;
      await onSave(dataToSave);
      
      // Display a single toast message on success
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
