import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { AdminTestingCardData } from './defaultAdminTestingCards';

// Import our modular components
import BasicDetailsSection from './edit-modal/BasicDetailsSection';
import ImageSelectionSection from './edit-modal/ImageSelectionSection';
import IconSelectionSection from './edit-modal/IconSelectionSection';
import ColorSettingsSection from './edit-modal/ColorSettingsSection';
import HighlightEffectToggle from './edit-modal/HighlightEffectToggle';
import ModalActions from './edit-modal/ModalActions';

interface AdminTestingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: AdminTestingCardData;
  onSave: (data: AdminTestingCardData) => void;
  onDelete: (cardId: string) => void;
  localStorageKey: string;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
}

const AdminTestingEditModal: React.FC<AdminTestingEditModalProps> = ({
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
  const [imagePreview, setImagePreview] = useState<string | null>(cardData?.background_image_url || null);
  const [iconPreview, setIconPreview] = useState<string | null>(cardData?.icon_url || null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(cardData?.icon_name || null);
  const [position, setPosition] = useState({ 
    x: cardData?.focal_point_x || 50, 
    y: cardData?.focal_point_y || 50 
  });
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  
  useEffect(() => {
    localStorage.setItem(`${localStorageKey}_carouselTimer`, String(carouselTimer));
  }, [carouselTimer, localStorageKey]);
  
  // Fix infinite type instantiation by explicitly typing the form values
  const form = useForm<AdminTestingCardData>({
    defaultValues: cardData || {
      id: '',
      title: '',
      description: '',
      icon_name: '',
      icon_url: '',
      icon_color: '#FFFFFF',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      background_image_url: '',
      background_opacity: 100,
      focal_point_x: 50,
      focal_point_y: 50,
      highlight_effect: false,
      priority: 'medium',
      points: 0,
      usage_data: [],
      background_images: []
    }
  });
  
  useEffect(() => {
    if (isOpen && cardData) {
      console.log("AdminTesting Modal opened with card data:", cardData);
      form.reset({
        id: cardData.id,
        title: cardData.title,
        description: cardData.description,
        icon_name: cardData.icon_name || '',
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
        points: cardData.points || 0,
        usage_data: cardData.usage_data || [],
        background_images: cardData.background_images || []
      });
      setImagePreview(cardData.background_image_url || null);
      setIconPreview(cardData.icon_url || null);
      setSelectedIconName(cardData.icon_name || null);
      setPosition({ 
        x: cardData.focal_point_x || 50, 
        y: cardData.focal_point_y || 50 
      });
      
      console.log("Initializing image slots from card data:", {
        hasBackgroundImages: Array.isArray(cardData.background_images),
        backgroundImagesCount: Array.isArray(cardData.background_images) ? cardData.background_images.length : 0,
        hasBackgroundImageUrl: Boolean(cardData.background_image_url)
      });
      
      const newImageSlots = [null, null, null, null, null];
      
      if (Array.isArray(cardData.background_images) && cardData.background_images.length > 0) {
        console.log("Loading background_images into slots:", cardData.background_images);
        cardData.background_images.forEach((img, index) => {
          if (index < newImageSlots.length && img) {
            // Fix for substring error - ensure img is a string before using substring
            const imgDisplay = typeof img === 'string' ? 
              (img.substring(0, 50) + '...') : 
              (typeof img === 'object' ? '[Object]' : String(img));
            
            console.log(`Setting slot ${index} to image:`, imgDisplay);
            newImageSlots[index] = typeof img === 'string' ? img : null;
          }
        });
      } else if (cardData.background_image_url) {
        // Fix for substring error - ensure background_image_url is a string
        const bgImgUrl = cardData.background_image_url;
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
  }, [isOpen, cardData, form]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // If no box selected, auto-select the first empty slot
    let targetIndex = selectedBoxIndex;
    if (targetIndex === null) {
      const firstEmpty = imageSlots.findIndex((slot) => !slot);
      if (firstEmpty === -1) {
        // All slots are full, select the first one
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
      
      // Clear preview but keep the selected box highlighted
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
        description: "Custom icon has been applied to the card",
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

  const handleDeleteCard = () => {
    try {
      console.log("AdminTesting: Deleting card", cardData.id);
      onDelete(cardData.id);
      onClose();
    } catch (error) {
      console.error("Error deleting admin testing card:", error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive"
      });
    }
  };
  
  const onSubmit = async (data: AdminTestingCardData) => {
    try {
      setIsSaving(true);
      console.log("Saving admin testing card data:", data);
      
      // Validate image slots before saving
      const validImageSlots = imageSlots
        .filter(slot => typeof slot === 'string' && slot.trim() !== '')
        .map(slot => {
          // Additional validation to ensure it's a valid data URL or image URL
          if (!slot) return null;
          try {
            if (slot.startsWith('data:image') || slot.startsWith('http')) {
              return slot;
            } else {
              console.warn("Invalid image data in slot:", typeof slot === 'string' ? slot.substring(0, 30) : String(slot));
              return null;
            }
          } catch (e) {
            console.error("Error validating image slot:", e);
            return null;
          }
        })
        .filter(Boolean) as string[];
      
      console.log(`Found ${validImageSlots.length} valid image slots after validation`);
      
      // Ensure background_image_url is set to the current imagePreview
      const updatedData = {
        ...data,
        background_image_url: imagePreview || '',
        icon_url: iconPreview || '',
        icon_name: selectedIconName || '',
        focal_point_x: position.x,
        focal_point_y: position.y,
        background_images: validImageSlots.length > 0 ? validImageSlots : imagePreview ? [imagePreview] : [],
      };
      
      console.log("Transformed data ready for save:", {
        id: updatedData.id,
        title: updatedData.title,
        imageCount: updatedData.background_images?.length || 0,
        hasBackgroundImageUrl: Boolean(updatedData.background_image_url),
        backgroundImageUrlPreview: updatedData.background_image_url ? 
          (typeof updatedData.background_image_url === 'string' ? 
            updatedData.background_image_url.substring(0, 30) + '...' : 
            String(updatedData.background_image_url)) 
          : 'none'
      });
      
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Admin Testing Card</DialogTitle>
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
              onDelete={handleDeleteCard}
              isSaving={isSaving}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTestingEditModal;
