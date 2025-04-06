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

export interface ThroneRoomCardData {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  icon_url?: string;
  background_image_url?: string | null;
  background_images?: string[];
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface ThroneRoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ThroneRoomCardData;
  onSave: (data: ThroneRoomCardData) => void;
}

const ThroneRoomEditModal: React.FC<ThroneRoomEditModalProps> = ({
  isOpen,
  onClose,
  cardData,
  onSave
}) => {
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
  const [carouselTimer, setCarouselTimer] = useState<number>(() => {
    const stored = localStorage.getItem("throneRoom_carouselTimer");
    return stored ? parseInt(stored, 10) : 5;
  });
  
  useEffect(() => {
    localStorage.setItem("throneRoom_carouselTimer", String(carouselTimer));
  }, [carouselTimer]);
  
  const form = useForm<ThroneRoomCardData>({
    defaultValues: {
      id: cardData?.id || '',
      title: cardData?.title || '',
      description: cardData?.description || '',
      iconName: cardData?.iconName || '',
      icon_url: cardData?.icon_url || '',
      background_image_url: cardData?.background_image_url || '',
      background_opacity: cardData?.background_opacity || 100,
      focal_point_x: cardData?.focal_point_x || 50,
      focal_point_y: cardData?.focal_point_y || 50,
      icon_color: cardData?.icon_color || '#FFFFFF',
      title_color: cardData?.title_color || '#FFFFFF',
      subtext_color: cardData?.subtext_color || '#8E9196',
      calendar_color: cardData?.calendar_color || '#7E69AB',
      highlight_effect: cardData?.highlight_effect || false,
      priority: cardData?.priority || 'medium',
    }
  });
  
  useEffect(() => {
    if (isOpen && cardData) {
      console.log("Modal opened with card data:", cardData);
      form.reset({
        id: cardData.id,
        title: cardData.title,
        description: cardData.description,
        iconName: cardData.iconName || '',
        icon_url: cardData.icon_url || '',
        background_image_url: cardData.background_image_url || '',
        background_opacity: cardData.background_opacity || 100,
        focal_point_x: cardData.focal_point_x || 50,
        focal_point_y: cardData.focal_point_y || 50,
        icon_color: cardData.icon_color || '#FFFFFF',
        title_color: cardData.title_color || '#FFFFFF',
        subtext_color: cardData.subtext_color || '#8E9196',
        calendar_color: cardData.calendar_color || '#7E69AB',
        highlight_effect: cardData.highlight_effect || false,
        priority: cardData.priority || 'medium',
      });
      setImagePreview(cardData.background_image_url || null);
      setIconPreview(cardData.icon_url || null);
      setSelectedIconName(cardData.iconName || null);
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
    if (!file || selectedBoxIndex === null) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = base64String;
      setImageSlots(updatedSlots);
      setImagePreview(base64String);
      form.setValue('background_image_url', base64String);
      form.setValue('background_opacity', 100);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = () => {
    if (selectedBoxIndex !== null) {
      const updatedSlots = [...imageSlots];
      updatedSlots[selectedBoxIndex] = null;
      setImageSlots(updatedSlots);
    }
    setImagePreview(null);
    form.setValue('background_image_url', '');
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
      const existingCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
      const updatedCards = existingCards.filter((card: ThroneRoomCardData) => card.id !== cardData.id);
      localStorage.setItem('throneRoomCards', JSON.stringify(updatedCards));
      
      toast({
        title: "Card Deleted",
        description: "The throne room card has been deleted",
      });
      
      onClose();
    } catch (error) {
      console.error('Error deleting throne room card:', error);
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
      console.log("Saving card data:", data);
      console.log("Current image slots:", imageSlots);
      
      const validImageSlots = imageSlots.map(slot => {
        if (!slot) return null;
        
        if (typeof slot !== 'string' || slot.trim() === '') {
          console.warn("Found invalid image slot:", slot);
          return null;
        }
        
        if (!slot.startsWith('data:image') && !slot.startsWith('http')) {
          console.warn("Image slot doesn't start with expected prefix:", slot.substring(0, 20));
        }
        
        return slot;
      });
      
      console.log("Valid image slots:", validImageSlots.map((s, i) => 
        s ? `[${i}: Valid ${s.substring(0, 20)}...]` : `[${i}: null]`));
      
      const updatedData = {
        ...data,
        background_image_url: imagePreview || undefined,
        icon_url: iconPreview || undefined,
        iconName: selectedIconName || undefined,
        focal_point_x: form.getValues('focal_point_x'),
        focal_point_y: form.getValues('focal_point_y'),
        background_images: validImageSlots.filter(Boolean),
      };
      
      console.log("Transformed updatedData:", {
        ...updatedData,
        background_images: updatedData.background_images?.length 
          ? `[${updatedData.background_images.length} images]` 
          : []
      });
      console.log("background_images being saved:", updatedData.background_images);
      
      try {
        const existingCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
        console.log("Existing cards before update:", 
          existingCards.map((c: ThroneRoomCardData) => ({ id: c.id, title: c.title })));
        
        const cardIndex = existingCards.findIndex((card: ThroneRoomCardData) => card.id === updatedData.id);
        console.log(`Card index in existing cards: ${cardIndex} (id: ${updatedData.id})`);
        
        if (cardIndex >= 0) {
          existingCards[cardIndex] = updatedData;
          console.log(`Updated existing card at index ${cardIndex}`);
        } else {
          existingCards.push(updatedData);
          console.log(`Added new card with id ${updatedData.id}`);
        }
        
        const cardsJson = JSON.stringify(existingCards);
        console.log(`Size of cards data to save: ${cardsJson.length} characters`);
        
        if (cardsJson.length > 4000000) {
          console.error("Warning: localStorage size limit approaching");
          toast({
            title: "Warning",
            description: "The data size is very large and may exceed storage limits.",
            variant: "destructive"
          });
        }
        
        localStorage.setItem('throneRoomCards', cardsJson);
        console.log("Cards after update:", JSON.parse(localStorage.getItem('throneRoomCards') || '[]')
          .map((c: ThroneRoomCardData) => ({ id: c.id, title: c.title })));
        
        await onSave(updatedData);
        
        toast({
          title: "Success",
          description: "Card settings saved successfully",
        });
        
        onClose();
      } catch (storageError) {
        console.error('Error with localStorage operations:', storageError);
        toast({
          title: "Storage Error",
          description: `Failed to save to localStorage: ${storageError.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving throne room card:', error);
      toast({
        title: "Error",
        description: `Failed to save card settings: ${error.message}`,
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
          <DialogTitle className="text-xl">Edit Card</DialogTitle>
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
                    {imageSlots.map((_, index) => (
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
                        {imageSlots[index] && (
                          <img
                            src={imageSlots[index] || ''}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-start space-y-1">
                    <span className="text-sm text-white font-medium leading-tight">
                      Carousel Timer
                    </span>
                    <span className="text-xs text-slate-400">
                      (Settings will be applied to all cards)
                    </span>

                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setCarouselTimer((prev) => Math.max(1, prev - 1))}
                        className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
                      >
                        –
                      </Button>

                      <div className="w-10 text-center text-white">{carouselTimer}</div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setCarouselTimer((prev) => prev + 1)}
                        className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
                      >
                        +
                      </Button>

                      <span className="text-sm text-slate-400">(s)</span>
                    </div>
                  </div>
                </div>
                <BackgroundImageSelector
                  control={form.control}
                  imagePreview={imagePreview}
                  initialPosition={{ 
                    x: form.getValues('focal_point_x'), 
                    y: form.getValues('focal_point_y') 
                  }}
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
