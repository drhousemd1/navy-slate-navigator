
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import RuleEditorForm from './rule-editor/RuleEditorForm';
import ImageSelectionSection from './rule-editor/ImageSelectionSection';
import HighlightEffectToggle from './rule-editor/HighlightEffectToggle';
import { useRuleCarousel } from './carousel/RuleCarouselContext';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_images?: (string | null)[];
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
  const carousel = useRuleCarousel();
  
  // Extract or initialize background_images from ruleData
  const initialBackgroundImages = ruleData?.background_images || 
    (ruleData?.background_image_url ? [ruleData.background_image_url] : []);
  
  const [imagePreview, setImagePreview] = useState<string | null>(ruleData?.background_image_url ?? null);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [position, setPosition] = useState({ 
    x: ruleData?.focal_point_x ?? 50, 
    y: ruleData?.focal_point_y ?? 50 
  });
  const [backgroundImages, setBackgroundImages] = useState<(string | null)[]>(
    initialBackgroundImages.length > 0 
      ? initialBackgroundImages 
      : [null, null, null, null, null]
  );

  const form = useForm<Rule>({
    defaultValues: {
      ...ruleData as Rule,
      highlight_effect: ruleData?.highlight_effect ?? false,
    },
  });

  useEffect(() => {
    form.reset({
      ...ruleData as Rule,
      highlight_effect: ruleData?.highlight_effect ?? false,
    });
    
    const images = ruleData?.background_images || 
      (ruleData?.background_image_url ? [ruleData.background_image_url] : []);
      
    setBackgroundImages(
      images.length > 0 
        ? [...images, ...Array(5 - images.length).fill(null)]
        : [null, null, null, null, null]
    );
    
    setImagePreview(ruleData?.background_image_url ?? null);
    setSelectedBoxIndex(null);
    setPosition({ 
      x: ruleData?.focal_point_x ?? 50, 
      y: ruleData?.focal_point_y ?? 50 
    });
  }, [ruleData]);

  const handleSave = async (formData: any) => {
    const validBackgroundImages = backgroundImages.filter(Boolean);
    
    const updatedRule = {
      ...formData,
      background_image_url: validBackgroundImages[0] || null,
      background_images: backgroundImages,
      focal_point_x: position.x,
      focal_point_y: position.y,
    };
    
    await onSave(updatedRule);
    carousel.resync();
    onClose();
  };

  const handleDelete = (ruleId: string) => {
    if (onDelete) {
      onDelete(ruleId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-3xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-white">
            {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {ruleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
          </DialogDescription>
        </DialogHeader>
        
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="h-full flex flex-col">
            <ScrollArea className="flex-1 px-6 py-4">
              <ImageSelectionSection
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                selectedBoxIndex={selectedBoxIndex}
                setSelectedBoxIndex={setSelectedBoxIndex}
                position={position}
                setPosition={setPosition}
                backgroundImages={backgroundImages}
                onBackgroundImagesChange={setBackgroundImages}
              />
              
              <HighlightEffectToggle control={form.control} />
              
              <RuleEditorForm
                ruleData={ruleData}
                onDelete={ruleData?.id && onDelete ? handleDelete : undefined}
                onCancel={onClose}
              />
            </ScrollArea>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
