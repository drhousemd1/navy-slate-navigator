
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RuleEditorForm from './rule-editor/RuleEditorForm';
import ImageSelectionSection from './rule-editor/ImageSelectionSection';
import HighlightEffectToggle from './rule-editor/HighlightEffectToggle';
import { useRuleCarousel } from './carousel/RuleCarouselContext';
import { Button } from './ui/button';
import { useForm, FormProvider } from 'react-hook-form';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_images?: (string | null)[];
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
  created_at?: string;
  updated_at?: string;
  user_id?: string;
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
  const { timer, setTimer } = useRuleCarousel();
  const [imagePreview, setImagePreview] = useState<string | null>(ruleData?.background_image_url || null);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [position, setPosition] = useState({ 
    x: ruleData?.focal_point_x || 50, 
    y: ruleData?.focal_point_y || 50 
  });

  const form = useForm<Rule>({
    defaultValues: {
      ...ruleData,
      background_images: ruleData?.background_images || [],
      background_opacity: ruleData?.background_opacity || 100,
      title_color: ruleData?.title_color || '#FFFFFF',
      subtext_color: ruleData?.subtext_color || '#D1D5DB',
      calendar_color: ruleData?.calendar_color || '#9c7abb',
      icon_color: ruleData?.icon_color || '#FFFFFF',
      highlight_effect: ruleData?.highlight_effect || false,
      focal_point_x: ruleData?.focal_point_x || 50,
      focal_point_y: ruleData?.focal_point_y || 50,
    }
  });

  useEffect(() => {
    if (ruleData) {
      form.reset({
        ...ruleData,
        background_images: ruleData?.background_images || [],
        background_opacity: ruleData?.background_opacity || 100,
        title_color: ruleData?.title_color || '#FFFFFF',
        subtext_color: ruleData?.subtext_color || '#D1D5DB',
        calendar_color: ruleData?.calendar_color || '#9c7abb',
        icon_color: ruleData?.icon_color || '#FFFFFF',
        highlight_effect: ruleData?.highlight_effect || false,
        focal_point_x: ruleData?.focal_point_x || 50,
        focal_point_y: ruleData?.focal_point_y || 50,
      } as Rule);
      setImagePreview(ruleData?.background_image_url || null);
      setPosition({ 
        x: ruleData?.focal_point_x || 50, 
        y: ruleData?.focal_point_y || 50 
      });
    }
  }, [ruleData, form]);

  const handleSave = async (formData: Partial<Rule>) => {
    const finalData = {
      ...formData,
      focal_point_x: position.x,
      focal_point_y: position.y,
      background_image_url: imagePreview,
    };
    
    await onSave(finalData);
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
        
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <ImageSelectionSection
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              selectedBoxIndex={selectedBoxIndex}
              setSelectedBoxIndex={setSelectedBoxIndex}
              position={position}
              setPosition={setPosition}
            />
            
            <HighlightEffectToggle control={form.control} />
            
            <RuleEditorForm
              carouselTimer={timer}
              onCarouselTimerChange={setTimer}
            />
            
            <div className="pt-4 w-full flex items-center justify-end gap-3">
              {ruleData?.id && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDelete(ruleData.id as string)}
                  className="bg-red-700 text-white hover:bg-red-600"
                >
                  Delete
                </Button>
              )}
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="bg-dark-navy border-light-navy text-white hover:bg-light-navy"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-nav-active text-white hover:bg-nav-active/90"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
