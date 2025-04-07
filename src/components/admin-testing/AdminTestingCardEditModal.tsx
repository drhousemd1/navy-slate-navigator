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
import { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { supabase } from '@/integrations/supabase/client';
import ImageSlotSelector from './ImageSlotSelector';

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [position, setPosition] = useState({ 
    x: 50, 
    y: 50 
  });
  const [imageSlots, setImageSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (localStorageKey) {
      localStorage.setItem(`${localStorageKey}_carouselTimer`, String(carouselTimer));
    }
  }, [carouselTimer, localStorageKey]);
  
  const form = useForm<ThroneRoomCardData>({
    defaultValues: {
      id: '',
      title: '',
      description: '',
      iconName: '',
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
      usage_data: [0, 0, 0, 0, 0, 0, 0]
    }
  });
  
  useEffect(() => {
    if (isOpen && cardData) {
      console.log("AdminTesting Modal opened with card data:", cardData);
      
      form.reset({
        id: cardData.id || '',
        title: cardData.title || '',
        description: cardData.description || '',
        iconName: cardData.iconName || '',
        icon_url: cardData.icon_url || '',
        icon_color: cardData.icon_color || '#FFFFFF',
        title_color: cardData.title_color || '#FFFFFF',
        subtext_color: cardData.subtext_color || '#8E9196',
        calendar_color: cardData.calendar_color || '#7E69AB',
        background_image_url: cardData.background_image_url || '',
        background_opacity: cardData.background_opacity !== undefined ? cardData.background_opacity : 100,
        focal_point_x: cardData.focal_point_x !== undefined ? cardData.focal_point_x : 50,
        focal_point_y: cardData.focal_point_y !== undefined ? cardData.focal_point_y : 50,
        highlight_effect: Boolean(cardData.highlight_effect),
        priority: cardData.priority || 'medium',
        usage_data: Array.isArray(cardData.usage_data) ? cardData.usage_data : [0, 0, 0, 0, 0, 0, 0]
      });
      
      setImagePreview(cardData.background_image_url || null);
      
      setIconPreview(cardData.icon_url || null);
      setSelectedIconName(cardData.iconName || null);
      
      setPosition({ 
        x: cardData.focal_point_x !== undefined ? cardData.focal_point_x : 50, 
        y: cardData.focal_point_y !== undefined ? cardData.focal_point_y : 50 
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
            console.log(`Setting slot ${index} to image:`, img.substring(0, 50) + '...');
            newImageSlots[index] = img;
          }
        });
      } else if (cardData.background_image_url) {
        console.log("Loading single background_image_url into slot 0:", 
          cardData.background_image_url.substring(0, 50) + '...');
        newImageSlots[0] = cardData.background_image_url;
      }
      
      setImageSlots(newImageSlots);
      console.log("Final image slots after initialization:", 
        newImageSlots.map(s => s ? `[Image: ${s.substring(0, 20)}...]` : 'null'));
    }
  }, [isOpen, cardData, form]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      console.log(`Removing image from slot ${selectedBoxIndex}`);
      
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
      
      setImagePreview(null);
      form.setValue('background_image_url', '');
      form.setValue('background_opacity', 100);
      
      toast({
        title: "Image Removed",
        description: "Background image has been removed",
      });
      
      console.log(`Updated image slots after removal:`, updatedSlots);
    } else {
      console.log('No slot selected for removal');
      toast({
        title: "No Image Selected",
        description: "Please select an image slot to remove",
        variant: "destructive"
      });
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
            form.setValue('iconName', '');
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
      form.setValue('iconName', '');
      
      toast({
        title: "Custom icon selected",
        description: "Custom icon has been applied to the card",
      });
    } else {
      setSelectedIconName(iconName);
      setIconPreview(null);
      form.setValue('iconName', iconName);
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
    } catch (error) {
      console.error("Error deleting admin testing card:", error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive"
      });
    }
  };
  
  const handleSlotSelect = (index: number) => {
    setSelectedBoxIndex(index);
    setImagePreview(imageSlots[index]);
    if (imageSlots[index]) {
      form.setValue('background_image_url', imageSlots[index] || '');
    }
  };
  
  const onSubmit = async (data: ThroneRoomCardData) => {
    try {
      setIsSaving(true);
      console.log("Saving admin testing card data:", data);
      console.log("Current image slots:", imageSlots.map((s, i) => 
        s ? `[${i}: ${s.substring(0, 20)}...]` : `[${i}: null]`));
      
      const validImageSlots = imageSlots
        .filter(slot => typeof slot === 'string' && slot.trim() !== '')
        .map(slot => {
          if (!slot) return null;
          try {
            if (slot.startsWith('data:image') || slot.startsWith('http')) {
              return slot;
            } else {
              console.warn("Invalid image data in slot:", slot.substring(0, 30));
              return null;
            }
          } catch (e) {
            console.error("Error validating image slot:", e);
            return null;
          }
        })
        .filter(Boolean) as string[];
      
      console.log(`Found ${validImageSlots.length} valid image slots after validation`);
      
      const updatedData: ThroneRoomCardData = {
        ...data,
        background_image_url: imagePreview,
        icon_url: iconPreview,
        iconName: selectedIconName || '',
        focal_point_x: position.x,
        focal_point_y: position.y,
        background_images: validImageSlots.length > 0 ? validImageSlots : undefined,
      };
      
      console.log("Transformed data ready for save:", {
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
                <ImageSlotSelector
                  imageSlots={imageSlots}
                  selectedBoxIndex={selectedBoxIndex}
                  onSelectSlot={handleSlotSelect}
                  carouselTimer={carouselTimer}
                  onCarouselTimerChange={onCarouselTimerChange}
                />
                
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
                        form.setValue('icon_url', '');
                        form.setValue('iconName', '');
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

export default AdminTestingCardEditModal;
