import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import PrioritySelector from '@/components/task-editor/PrioritySelector';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import IconSelector from '@/components/task-editor/IconSelector';
import PredefinedIconsGrid from '@/components/task-editor/PredefinedIconsGrid';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ThroneRoomCardData {
  id: string;
  title: string;
  description: string;
  iconName: string;
  icon_url?: string;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string;
  background_images?: string[];
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  highlight_effect: boolean;
  priority: 'low' | 'medium' | 'high';
  usage_data?: number[];
}

interface ThroneRoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ThroneRoomCardData;
  onSave: (data: ThroneRoomCardData) => void;
  onDelete?: (cardId: string) => void;
  localStorageKey?: string;
  pageTitle?: string;
}

const ThroneRoomEditModal: React.FC<ThroneRoomEditModalProps> = ({
  isOpen,
  onClose,
  cardData,
  onSave,
  onDelete,
  localStorageKey = 'throneRoomCards',
  pageTitle = 'Throne Room'
}) => {
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(cardData?.background_image_url || null);
  const [iconPreview, setIconPreview] = useState<string | null>(cardData?.icon_url || null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(cardData?.iconName || null);
  const [position, setPosition] = useState({ 
    x: cardData?.focal_point_x || 50, 
    y: cardData?.focal_point_y || 50 
  });
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  
  const form = useForm<ThroneRoomCardData>({
    shouldFocusError: false, // Prevent auto-focus on validation errors
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

  // Defensive blur for mobile to prevent auto-focus
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);
  
  useEffect(() => {
    if (isOpen && cardData) {
      logger.debug("Modal opened with card data:", cardData);
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
      setImagePreview(cardData.background_image_url || null);
      setIconPreview(cardData.icon_url || null);
      setSelectedIconName(cardData.iconName || null);
      setPosition({ 
        x: cardData.focal_point_x || 50, 
        y: cardData.focal_point_y || 50 
      });
      
      logger.debug("Initializing image slots from card data:", {
        hasBackgroundImages: Array.isArray(cardData.background_images),
        backgroundImagesCount: Array.isArray(cardData.background_images) ? cardData.background_images.length : 0,
        hasBackgroundImageUrl: Boolean(cardData.background_image_url)
      });
      
      const newImageSlots = [null, null, null, null, null];
      
      if (Array.isArray(cardData.background_images) && cardData.background_images.length > 0) {
        logger.debug("Loading background_images into slots:", cardData.background_images);
        cardData.background_images.forEach((img, index) => {
          if (index < newImageSlots.length && img) {
            logger.debug(`Setting slot ${index} to image:`, img.substring(0, 50) + '...');
            newImageSlots[index] = img;
          }
        });
      } else if (cardData.background_image_url) {
        logger.debug("Loading single background_image_url into slot 0:", 
          cardData.background_image_url.substring(0, 50) + '...');
        newImageSlots[0] = cardData.background_image_url;
      }
      
      setImageSlots(newImageSlots);
      logger.debug("Final image slots after initialization:", 
        newImageSlots.map(s => s ? `[Image: ${s.substring(0, 20)}...]` : 'null'));
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
      logger.debug(`Auto-selected box index ${targetIndex} since none was selected`);
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64String = reader.result as string;
        logger.debug(`Image loaded, size: ${Math.round(base64String.length / 1024)}KB`);
        
        const updatedSlots = [...imageSlots];
        updatedSlots[targetIndex!] = base64String;
        setImageSlots(updatedSlots);
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
        form.setValue('background_opacity', 100);
        
        logger.debug(`Updated image slot ${targetIndex} and set as preview`);
      } catch (error) {
        logger.error("Error processing uploaded image:", error);
        toast({
          title: "Image Error",
          description: "There was a problem processing the uploaded image",
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = (error) => {
      logger.error("FileReader error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to read the image file",
        variant: "destructive"
      });
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      logger.error("Error reading file as data URL:", error);
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
      
      logger.debug(`Removed image from slot ${selectedBoxIndex}, cleared preview but kept selection`);
    } else {
      logger.debug('No slot selected for removal');
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
            form.setValue('iconName', undefined);
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
      form.setValue('iconName', undefined);
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the card",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      form.setValue('iconName', iconName);
      form.setValue('icon_url', undefined);
      
      toast({
        title: "Icon selected",
        description: `${iconName} icon selected`,
      });
    }
  };

  const handleDeleteCard = () => {
    try {
      if (onDelete) {
        // Use the passed delete handler if provided
        onDelete(cardData.id);
      } else {
        // Default deletion behavior using localStorage
        const existingCards = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const updatedCards = existingCards.filter((card: ThroneRoomCardData) => card.id !== cardData.id);
        localStorage.setItem(localStorageKey, JSON.stringify(updatedCards));
        
        toast({
          title: "Card Deleted",
          description: `The ${pageTitle.toLowerCase()} card has been deleted`,
        });
        
        onClose();
      }
    } catch (error) {
      logger.error(`Error deleting ${pageTitle.toLowerCase()} card:`, error);
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
      logger.debug(`Saving ${pageTitle.toLowerCase()} card data:`, data);
      logger.debug("Current image slots:", imageSlots.map((s, i) => 
        s ? `[${i}: ${s.substring(0, 20)}...]` : `[${i}: null]`));
      
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
              logger.warn("Invalid image data in slot:", slot.substring(0, 30));
              return null;
            }
          } catch (e) {
            logger.error("Error validating image slot:", e);
            return null;
          }
        })
        .filter(Boolean) as string[];
      
      logger.debug(`Found ${validImageSlots.length} valid image slots after validation`);
      
      const updatedData = {
        ...data,
        background_image_url: imagePreview || undefined,
        icon_url: iconPreview || undefined,
        iconName: selectedIconName || undefined,
        focal_point_x: position.x,
        focal_point_y: position.y,
        background_images: validImageSlots,
      };
      
      logger.debug("Transformed data ready for save:", {
        id: updatedData.id,
        title: updatedData.title,
        imageCount: updatedData.background_images?.length || 0,
        hasBackgroundImageUrl: Boolean(updatedData.background_image_url)
      });
      
      await onSave(updatedData);
      
      toast({
        title: "Success",
        description: "Card settings saved successfully",
      });
      
      onClose();
    } catch (error) {
      logger.error(`Error saving ${pageTitle.toLowerCase()} card:`, error);
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
          <DialogTitle className="text-xl">Edit {pageTitle} Card</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter title" 
                        className="bg-dark-navy border-light-navy text-white"
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter description" 
                        className="bg-dark-navy border-light-navy text-white"
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Priority</FormLabel>
                    <FormControl>
                      <PrioritySelector 
                        control={form.control}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <FormLabel className="text-white text-lg">Background Image</FormLabel>
                <div className="flex flex-row items-end space-x-6 mb-4">
                  <div className="flex space-x-2">
                    {imageSlots.map((imageUrl, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedBoxIndex(index);
                          setImagePreview(imageSlots[index]);
                        }}
                        className={`w-12 h-12 rounded-md cursor-pointer transition-all
                          ${selectedBoxIndex === index
                            ? 'border-[2px] border-[#FEF7CD] shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]'
                            : 'bg-dark-navy border border-light-navy hover:border-white'}
                        `}
                      >
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              logger.error(`Error loading image in slot ${index}`);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTkgOUwxNSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <BackgroundImageSelector
                  control={form.control}
                  imagePreview={imagePreview}
                  initialPosition={position}
                  onRemoveImage={handleRemoveImage}
                  onImageUpload={handleImageUpload}
                  setValue={form.setValue}
                />
              </div>
              
              <div className="space-y-4">
                <FormLabel className="text-white text-lg">Card Icon</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                    <IconSelector
                      selectedIconName={selectedIconName}
                      iconPreview={iconPreview}
                      iconColor={form.watch('icon_color')}
                      onSelectIcon={handleIconSelect}
                      onUploadIcon={handleIconUpload}
                      onRemoveIcon={() => {
                        setIconPreview(null);
                        setSelectedIconName(null);
                        form.setValue('icon_url', undefined);
                        form.setValue('iconName', undefined);
                      }}
                    />
                  </div>
                  
                  <PredefinedIconsGrid
                    selectedIconName={selectedIconName}
                    iconColor={form.watch('icon_color')}
                    onSelectIcon={handleIconSelect}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="text-white font-medium text-sm">Colors</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPickerField 
                    control={form.control}
                    name="title_color"
                    label="Title Color"
                  />
                  
                  <ColorPickerField 
                    control={form.control}
                    name="subtext_color"
                    label="Description Color"
                  />
                  
                  <ColorPickerField 
                    control={form.control}
                    name="calendar_color"
                    label="Calendar Color"
                  />
                  
                  <ColorPickerField 
                    control={form.control}
                    name="icon_color"
                    label="Icon Color"
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="highlight_effect"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Highlight Effect</FormLabel>
                      <FormDescription className="text-gray-400">
                        Apply a highlight behind title and description
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="flex justify-between items-center pt-4">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDeleteCard} 
                className="mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Card
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="bg-transparent border border-slate-600 text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ThroneRoomEditModal;
