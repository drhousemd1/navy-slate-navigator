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
    }
  }, [isOpen, cardData, form]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('background_image_url', base64String);
        form.setValue('background_opacity', 100);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
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
      
      const updatedData = {
        ...data,
        background_image_url: imagePreview || undefined,
        icon_url: iconPreview || undefined,
        iconName: selectedIconName || undefined,
        focal_point_x: form.getValues('focal_point_x'),
        focal_point_y: form.getValues('focal_point_y'),
      };
      
      const existingCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
      const cardIndex = existingCards.findIndex((card: ThroneRoomCardData) => card.id === updatedData.id);
      
      if (cardIndex >= 0) {
        existingCards[cardIndex] = updatedData;
      } else {
        existingCards.push(updatedData);
      }
      
      localStorage.setItem('throneRoomCards', JSON.stringify(existingCards));
      
      await onSave(updatedData);
      
      toast({
        title: "Success",
        description: "Card settings saved successfully",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving throne room card:', error);
      toast({
        title: "Error",
        description: "Failed to save card settings",
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
                <div className="flex space-x-2 mb-4">
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 rounded-md bg-dark-navy border border-light-navy hover:border-white cursor-pointer"
                    />
                  ))}
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
