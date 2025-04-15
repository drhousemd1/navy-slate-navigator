import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { RuleCardData } from './hooks/useRuleCardData';

import BasicDetailsSection from '@/components/admin-testing/edit-modal/BasicDetailsSection';
import ImageSelectionSection from '@/components/rule-editor/ImageSelectionSection';
import IconSelectionSection from '@/components/admin-testing/edit-modal/IconSelectionSection';
import ColorSettingsSection from '@/components/admin-testing/edit-modal/ColorSettingsSection';
import HighlightEffectToggle from '@/components/admin-testing/edit-modal/HighlightEffectToggle';
import ModalActions from '@/components/admin-testing/edit-modal/ModalActions';

import { uploadImageToStorage } from '@/lib/uploadImage';
import { getPublicImageUrl } from '@/lib/getImageUrl';

interface RuleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleData: RuleCardData;
  onSave: (data: RuleCardData) => void;
  onDelete: (ruleId: string) => void;
  localStorageKey: string;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
}

type RuleFormValues = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  icon_url: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url: string | null;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  highlight_effect: boolean;
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data: number[] | any;
  background_images: string[] | any;
};

const RuleEditModal: React.FC<RuleEditModalProps> = ({
  isOpen,
  onClose,
  ruleData,
  onSave,
  onDelete,
  localStorageKey,
  carouselTimer,
  onCarouselTimerChange
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(ruleData?.background_image_url || null);
  const [iconPreview, setIconPreview] = useState<string | null>(ruleData?.icon_url || null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(ruleData?.icon_name || null);
  const [position, setPosition] = useState({ 
    x: ruleData?.focal_point_x || 50, 
    y: ruleData?.focal_point_y || 50 
  });
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  
  useEffect(() => {
    localStorage.setItem(`${localStorageKey}_carouselTimer`, String(carouselTimer));
  }, [carouselTimer, localStorageKey]);
  
  const form = useForm<RuleFormValues>({
    defaultValues: {
      id: ruleData?.id || '',
      title: ruleData?.title || '',
      description: ruleData?.description || '',
      icon_name: ruleData?.icon_name || '',
      icon_url: ruleData?.icon_url || null,
      icon_color: ruleData?.icon_color || '#FFFFFF',
      title_color: ruleData?.title_color || '#FFFFFF',
      subtext_color: ruleData?.subtext_color || '#8E9196',
      calendar_color: ruleData?.calendar_color || '#7E69AB',
      background_image_url: ruleData?.background_image_url || null,
      background_opacity: ruleData?.background_opacity || 100,
      focal_point_x: ruleData?.focal_point_x || 50,
      focal_point_y: ruleData?.focal_point_y || 50,
      highlight_effect: ruleData?.highlight_effect || false,
      priority: ruleData?.priority || 'medium',
      frequency: ruleData?.frequency || 'daily',
      frequency_count: ruleData?.frequency_count || 3,
      usage_data: ruleData?.usage_data || [],
      background_images: ruleData?.background_images || []
    }
  });
  
  useEffect(() => {
    if (isOpen && ruleData) {
      console.log("Rule Modal opened with rule data:", ruleData);
      form.reset({
        id: ruleData.id,
        title: ruleData.title,
        description: ruleData.description,
        icon_name: ruleData.icon_name || '',
        icon_url: ruleData.icon_url || null,
        icon_color: ruleData.icon_color || '#FFFFFF',
        title_color: ruleData.title_color || '#FFFFFF',
        subtext_color: ruleData.subtext_color || '#8E9196',
        calendar_color: ruleData.calendar_color || '#7E69AB',
        background_image_url: ruleData.background_image_url || null,
        background_opacity: ruleData.background_opacity || 100,
        focal_point_x: ruleData.focal_point_x || 50,
        focal_point_y: ruleData.focal_point_y || 50,
        highlight_effect: ruleData.highlight_effect || false,
        priority: ruleData.priority || 'medium',
        frequency: ruleData.frequency || 'daily',
        frequency_count: ruleData.frequency_count || 3,
        usage_data: ruleData.usage_data || [],
        background_images: ruleData.background_images || []
      });
      setImagePreview(ruleData.background_image_url || null);
      setIconPreview(ruleData.icon_url || null);
      setSelectedIconName(ruleData.icon_name || null);
      setPosition({ 
        x: ruleData.focal_point_x || 50, 
        y: ruleData.focal_point_y || 50 
      });
      
      console.log("Initializing image slots from rule data:", {
        hasBackgroundImages: Array.isArray(ruleData.background_images),
        backgroundImagesCount: Array.isArray(ruleData.background_images) ? ruleData.background_images.length : 0,
        hasBackgroundImageUrl: Boolean(ruleData.background_image_url)
      });
      
      const newImageSlots = [null, null, null, null, null];
      
      if (Array.isArray(ruleData.background_images) && ruleData.background_images.length > 0) {
        console.log("Loading background_images into slots:", ruleData.background_images);
        ruleData.background_images.forEach((img, index) => {
          if (index < newImageSlots.length && img) {
            const imgStr = typeof img === 'string' ? img : '';
            const imgDisplay = imgStr ? (imgStr.substring(0, 50) + '...') : '[Non-string]';
            
            console.log(`Setting slot ${index} to image:`, imgDisplay);
            newImageSlots[index] = typeof img === 'string' ? img : null;
          }
        });
      } else if (ruleData.background_image_url) {
        const bgImgUrl = ruleData.background_image_url;
        const bgImgPreview = typeof bgImgUrl === 'string' ? 
          (bgImgUrl.substring(0, 50) + '...') : 
          String(bgImgUrl);
          
        console.log("Loading single background_image_url into slot 0:", bgImgPreview);
        newImageSlots[0] = typeof bgImgUrl === 'string' ? bgImgUrl : null;
      }
      
      setImageSlots(newImageSlots);
      console.log("Final image slots after initialization:", 
        newImageSlots.map(s => s ? 
          (typeof s === 'string' ? `[Image: ${s.substring(0, 20)}...]` : '[Non-string]') 
          : 'null'));
    }
  }, [isOpen, ruleData, form]);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    let targetIndex = selectedBoxIndex;
    if (targetIndex === null) {
      const firstEmpty = imageSlots.findIndex((slot) => !slot);
      if (firstEmpty === -1) {
        targetIndex = 0;
      } else {
        targetIndex = firstEmpty;
      }
      setSelectedBoxIndex(targetIndex);
      console.log(`Auto-selected box index ${targetIndex} since none was selected`);
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64String = reader.result as string;
        console.log(`Image loaded, size: ${Math.round(base64String.length / 1024)}KB`);
        
        const updatedSlots = [...imageSlots];
        updatedSlots[targetIndex!] = base64String;
        setImageSlots(updatedSlots);
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
        form.setValue('background_opacity', 100);
        
        console.log(`Updated image slot ${targetIndex} and set as preview`);
      } catch (error) {
        console.error("Error processing uploaded image:", error);
        toast({
          title: "Image Error",
          description: "There was a problem processing the uploaded image",
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to read the image file",
        variant: "destructive"
      });
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file as data URL:", error);
      toast({
        title: "File Error",
        description: "Failed to read the image file",
        variant: "destructive"
      });
    }
  };
  
  const handleRemoveImage = () => {
    if (selectedBoxIndex !== null) {
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
      
      setImagePreview(null);
      form.setValue('background_image_url', '');
      
      console.log(`Removed image from slot ${selectedBoxIndex}, cleared preview but kept selection`);
    } else {
      console.log('No slot selected for removal');
    }
  };

  const handleIconUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.files) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setIconPreview(base64String);
            setSelectedIconName(null);
            form.setValue('icon_url', base64String);
            form.setValue('icon_name', '');
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleIconSelect = (iconName: string) => {
    if (iconName.startsWith('custom:')) {
      const iconUrl = iconName.substring(7);
      setIconPreview(iconUrl);
      setSelectedIconName(null);
      form.setValue('icon_url', iconUrl);
      form.setValue('icon_name', '');
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the rule",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      form.setValue('icon_name', iconName);
      form.setValue('icon_url', '');
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };

  const handleDeleteRule = () => {
    try {
      console.log("Rule: Deleting rule", ruleData.id);
      onDelete(ruleData.id);
      onClose();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };
  
  const onSubmit = async (data: RuleFormValues) => {
    try {
      setIsSaving(true);
      
      const validImageSlots = imageSlots
        .filter((slot): slot is string => typeof slot === 'string' && slot.trim() !== '')
        .filter(slot => 
          slot.startsWith('data:image') || 
          slot.startsWith('http') || 
          slot.startsWith('https')
        );
      
      let imagePath: string | null = null;
      
      if (imagePreview && imagePreview.startsWith('data:image')) {
        imagePath = await uploadImageToStorage(imagePreview);
        console.log(`Uploaded image to storage, new path: ${imagePath}`);
      } else if (ruleData.background_image_path) {
        imagePath = ruleData.background_image_path;
      }
      
      const imageUrl = imagePath ? getPublicImageUrl(imagePath) : imagePreview;
      
      const updatedData: RuleCardData = {
        ...data,
        background_image_url: imageUrl,
        background_image_path: imagePath,
        icon_url: iconPreview || '',
        icon_name: selectedIconName || '',
        focal_point_x: position.x,
        focal_point_y: position.y,
        background_images: validImageSlots.length > 0 
          ? validImageSlots 
          : (imageUrl ? [imageUrl] : []),
      };
      
      await onSave(updatedData);
      
      onClose();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast({
        title: "Error",
        description: `Failed to save rule settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Rule</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <BasicDetailsSection control={form.control} />
            
            <ImageSelectionSection
              imagePreview={imagePreview}
              imageSlots={imageSlots}
              selectedBoxIndex={selectedBoxIndex}
              carouselTimer={carouselTimer}
              onCarouselTimerChange={onCarouselTimerChange}
              onSelectImageSlot={setSelectedBoxIndex}
              onRemoveImage={handleRemoveImage}
              onImageUpload={handleImageUpload}
              setValue={form.setValue}
              position={position}
              control={form.control}
            />
            
            <IconSelectionSection
              selectedIconName={selectedIconName}
              iconPreview={iconPreview}
              iconColor={form.watch('icon_color')}
              onSelectIcon={handleIconSelect}
              onUploadIcon={handleIconUpload}
              onRemoveIcon={() => {
                setIconPreview(null);
                setSelectedIconName(null);
                form.setValue('icon_url', '');
                form.setValue('icon_name', '');
              }}
            />
            
            <ColorSettingsSection control={form.control} />
            
            <HighlightEffectToggle control={form.control} />
            
            <ModalActions
              onClose={onClose}
              onDelete={handleDeleteRule}
              isSaving={isSaving}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditModal;
