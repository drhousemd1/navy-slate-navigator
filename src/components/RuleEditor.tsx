
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RuleEditorForm from './rule-editor/RuleEditorForm';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_images?: string[];
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data?: number[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  carousel_timer?: number;
}

interface RuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  ruleData?: Partial<Rule>;
  onSave: (ruleData: Partial<Rule>) => void;
  onDelete?: (ruleId: string) => void;
  carouselTimer?: number;
  setCarouselTimer?: (seconds: number) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ 
  isOpen, 
  onClose, 
  ruleData, 
  onSave, 
  onDelete,
  carouselTimer = 5,
  setCarouselTimer
}) => {
  const handleSave = async (formData: Partial<Rule>) => {
    // Add carousel timer to the saved data if it was changed
    if (setCarouselTimer && formData.carousel_timer !== carouselTimer) {
      setCarouselTimer(formData.carousel_timer || 5);
    }
    
    await onSave(formData);
    onClose();
  };

  const handleDelete = (ruleId: string) => {
    if (onDelete) {
      onDelete(ruleId);
      onClose(); // Ensure modal closes after deletion
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {ruleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
          </DialogDescription>
        </DialogHeader>
        
        <RuleEditorForm
          ruleData={{
            ...ruleData,
            carousel_timer: carouselTimer
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
