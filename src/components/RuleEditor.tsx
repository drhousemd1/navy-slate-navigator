
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
  background_images: string[];
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
  carousel_timer: number;
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
  const { carouselTimer, setCarouselTimer } = useRuleCarousel();

  const handleSave = async (formData: any) => {
    await onSave(formData);
    
    if (formData.carousel_timer) {
      setCarouselTimer(formData.carousel_timer);
    }
    
    onClose();
  };

  const handleDelete = (ruleId: string) => {
    if (onDelete) {
      onDelete(ruleId);
      onClose(); // Ensure modal closes after deletion
    }
  };

  // Make sure we have a valid rule data object with necessary defaults
  const enhancedRuleData = {
    title: '',
    description: '',
    priority: 'medium' as const,
    background_opacity: 100,
    title_color: '#FFFFFF',
    subtext_color: '#CCCCCC',
    calendar_color: '#9c7abb',
    icon_color: '#FFFFFF',
    highlight_effect: false,
    focal_point_x: 50,
    focal_point_y: 50,
    frequency: 'daily' as const,
    frequency_count: 1,
    background_images: Array(5).fill(''),
    carousel_timer: carouselTimer,
    ...ruleData // This will override defaults with any existing values
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
