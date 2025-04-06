
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import PrioritySelector from '@/components/task-editor/PrioritySelector';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { Loader2 } from 'lucide-react';

export interface ThroneRoomCardData {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  background_image_url?: string;
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
      form.reset({
        id: cardData.id,
        title: cardData.title,
        description: cardData.description,
        iconName: cardData.iconName || '',
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
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setImagePreview(null);
    form.setValue('background_image_url', '');
  };
  
  const onSubmit = async (data: ThroneRoomCardData) => {
    try {
      setIsSaving(true);
      
      const updatedData = {
        ...data,
        background_image_url: imagePreview || undefined,
        focal_point_x: position.x,
        focal_point_y: position.y,
      };
      
      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error('Error saving throne room card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePosition = (x: number, y: number) => {
    setPosition({ x, y });
    form.setValue('focal_point_x', x);
    form.setValue('focal_point_y', y);
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
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
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
              
              <BackgroundImageSelector
                imagePreview={imagePreview}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
                control={form.control}
                setValue={form.setValue}
                initialPosition={position}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ThroneRoomEditModal;
