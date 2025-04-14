
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RuleEditorForm from './rule-editor/RuleEditorForm';
import { useRuleCarousel } from '@/contexts/RuleCarouselContext';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
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
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
}

interface RuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  ruleData?: Partial<Rule>;
  onSave: (ruleData: Partial<Rule>) => void;
  onDelete?: (ruleId: string) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ 
  isOpen, 
  onClose, 
  ruleData, 
  onSave, 
  onDelete 
}) => {
  const { setCarouselTimer } = useRuleCarousel();

  // Enhance rule data with default values to prevent undefined errors
  const enhancedRuleData: Partial<Rule> = {
    background_opacity: 100,
    focal_point_x: 50,
    focal_point_y: 50,
    ...ruleData,
    // Ensure background_images is a valid array
    background_images: Array.isArray(ruleData?.background_images) 
      ? ruleData.background_images 
      : ruleData?.background_image_url 
        ? [ruleData.background_image_url] 
        : []
  };

  const handleSave = async (formData: Partial<Rule>) => {
    if (formData.carousel_timer) {
      setCarouselTimer(formData.carousel_timer);
    }
    
    // Make sure background_images is an array of strings (no nulls)
    if (formData.background_images) {
      formData.background_images = formData.background_images.filter(
        (img): img is string => typeof img === 'string' && img.trim() !== ''
      );
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
            {enhancedRuleData?.id ? 'Edit Rule' : 'Create New Rule'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {enhancedRuleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
          </DialogDescription>
        </DialogHeader>
        
        <RuleEditorForm
          ruleData={enhancedRuleData}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
