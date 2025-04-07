
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';

// Import refactored components
import BasicDetailsSection from './edit-modal/BasicDetailsSection';
import ImageSelectionSection from './edit-modal/ImageSelectionSection';
import IconSelectionSection from './edit-modal/IconSelectionSection';
import ColorSettingsSection from './edit-modal/ColorSettingsSection';
import HighlightEffectToggle from './edit-modal/HighlightEffectToggle';
import ModalActions from './edit-modal/ModalActions';

// Import custom hooks
import { useModalImageHandling } from './edit-modal/hooks/useModalImageHandling';
import { useModalIconHandling } from './edit-modal/hooks/useModalIconHandling';

interface AdminTestingCardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ThroneRoomCardData;
  onSave: (data: ThroneRoomCardData) => void;
  onDelete: (cardId: string) => void;
  localStorageKey: string;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
}

const AdminTestingCardEditModal: React.FC<AdminTestingCardEditModalProps> = ({
  isOpen,
  onClose,
  cardData,
  onSave,
  onDelete,
  localStorageKey,
  carouselTimer,
  onCarouselTimerChange
}) => {
  const [isSaving, setIsSaving] = useState(false);
  
  // Use custom hooks for image and icon handling
  const {
    imagePreview,
    imageSlots,
    selectedBoxIndex,
    position,
    setPosition,
    handleImageUpload,
    handleRemoveImage,
    handleSelectImageSlot,
    getProcessedImages
  } = useModalImageHandling(cardData?.background_image_url, cardData?.background_images);
  
  const {
    iconPreview,
    selectedIconName,
    handleIconUpload,
    handleIconSelect,
    handleRemoveIcon
  } = useModalIconHandling(cardData?.icon_url, cardData?.iconName);
  
  // Store carousel timer in localStorage
  useEffect(() => {
    localStorage.setItem(`${localStorageKey}_carouselTimer`, String(carouselTimer));
  }, [carouselTimer, localStorageKey]);
  
  const form = useForm<ThroneRoomCardData>({
    defaultValues: {
      id: cardData?.id || '',
      title: cardData?.title || '',
      description: cardData?.description || '',
      iconName: cardData?.iconName || '',
      icon_url: cardData?.icon_url || '',
      icon_color: cardData?.icon_color || '#FFFFFF',
      title_color: cardData?.title_color || '#FFFFFF',
      subtext_color: cardData?.subtext_color || '#8E9196',
      calendar_color: cardData?.calendar_color || '#7E69AB',
      background_image_url: cardData?.background_image_url || '',
      background_opacity: cardData?.background_opacity || 100,
      focal_point_x: cardData?.focal_point_x || 50,
      focal_point_y: cardData?.focal_point_y || 50,
      highlight_effect: cardData?.highlight_effect || false,
      priority: cardData?.priority || 'medium',
      usage_data: cardData?.usage_data || []
    }
  });
  
  // Reset form when modal opens with new card data
  useEffect(() => {
    if (isOpen && cardData) {
      console.log("AdminTesting Modal opened with card data:", cardData);
      form.reset({
        id: cardData.id,
        title: cardData.title,
        description: cardData.description,
        iconName: cardData.iconName || '',
        icon_url: cardData.icon_url || '',
        icon_color: cardData.icon_color || '#FFFFFF',
        title_color: cardData.title_color || '#FFFFFF',
        subtext_color: cardData.subtext_color || '#8E9196',
        calendar_color: cardData.calendar_color || '#7E69AB',
        background_image_url: cardData.background_image_url || '',
        background_opacity: cardData.background_opacity || 100,
        focal_point_x: cardData.focal_point_x || 50,
        focal_point_y: cardData.focal_point_y || 50,
        highlight_effect: cardData.highlight_effect || false,
        priority: cardData.priority || 'medium',
        usage_data: cardData.usage_data || []
      });
    }
  }, [isOpen, cardData, form]);

  const handleDeleteCard = () => {
    try {
      console.log("AdminTesting: Deleting card", cardData.id);
      onDelete(cardData.id);
    } catch (error) {
      console.error("Error deleting admin testing card:", error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive"
      });
    }
  };
  
  const onSubmit = async (data: ThroneRoomCardData) => {
    try {
      setIsSaving(true);
      console.log("Saving admin testing card data:", data);
      
      const { backgroundImageUrl, backgroundImages } = getProcessedImages();
      
      const updatedData = {
        ...data,
        background_image_url: backgroundImageUrl || undefined,
        icon_url: iconPreview || undefined,
        iconName: selectedIconName || undefined,
        focal_point_x: position.x,
        focal_point_y: position.y,
        background_images: backgroundImages,
      };
      
      await onSave(updatedData);
      
      toast({
        title: "Success",
        description: "Card settings saved successfully",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to save card settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper method to set form values
  const setValue = (key: string, value: any) => {
    form.setValue(key as any, value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Admin Testing Card</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic details section */}
            <BasicDetailsSection control={form.control} />
            
            {/* Image selection section */}
            <ImageSelectionSection 
              imagePreview={imagePreview}
              imageSlots={imageSlots}
              selectedBoxIndex={selectedBoxIndex}
              carouselTimer={carouselTimer}
              onCarouselTimerChange={onCarouselTimerChange}
              onSelectImageSlot={handleSelectImageSlot}
              onRemoveImage={handleRemoveImage}
              onImageUpload={handleImageUpload}
              setValue={setValue}
              position={position}
            />
            
            {/* Icon selection section */}
            <IconSelectionSection 
              selectedIconName={selectedIconName}
              iconPreview={iconPreview}
              iconColor={form.watch('icon_color')}
              onSelectIcon={handleIconSelect}
              onUploadIcon={handleIconUpload}
              onRemoveIcon={handleRemoveIcon}
            />
            
            {/* Color settings section */}
            <ColorSettingsSection control={form.control} />
            
            {/* Highlight effect toggle */}
            <HighlightEffectToggle control={form.control} />
            
            {/* Modal actions */}
            <ModalActions 
              onClose={onClose}
              onDelete={handleDeleteCard}
              isSaving={isSaving}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTestingCardEditModal;
