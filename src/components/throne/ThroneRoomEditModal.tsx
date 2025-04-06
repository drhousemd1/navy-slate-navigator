
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import IconSelector from '@/components/task-editor/IconSelector';
import PredefinedIconsGrid from '@/components/task-editor/PredefinedIconsGrid';
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Loader2 } from 'lucide-react';
import DeleteTaskDialog from '@/components/task-editor/DeleteTaskDialog';
import PrioritySelector from '@/components/task-editor/PrioritySelector';

export interface ThroneRoomCardData {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  icon_name: z.string().optional(),
  icon_color: z.string().optional(),
  title_color: z.string().optional(),
  subtext_color: z.string().optional(),
  calendar_color: z.string().optional(),
  highlight_effect: z.boolean().optional(),
  background_image_url: z.string().nullable().optional(),
  background_opacity: z.number().min(0).max(100).optional(),
  focal_point_x: z.number().optional(),
  focal_point_y: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  points: z.number().optional(),
});

interface ThroneRoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ThroneRoomCardData;
  onSave: (updatedData: ThroneRoomCardData) => void;
  onDelete?: (id: string) => void;
}

const ThroneRoomEditModal: React.FC<ThroneRoomEditModalProps> = ({
  isOpen,
  onClose,
  cardData,
  onSave,
  onDelete
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: cardData.title || '',
      description: cardData.description || '',
      icon_name: cardData.icon_name || cardData.iconName || '',
      icon_color: cardData.icon_color || '#FFFFFF',
      title_color: cardData.title_color || '#FFFFFF',
      subtext_color: cardData.subtext_color || '#8E9196',
      calendar_color: cardData.calendar_color || '#7E69AB',
      highlight_effect: cardData.highlight_effect || false,
      background_image_url: cardData.background_image_url || null,
      background_opacity: cardData.background_opacity || 100,
      focal_point_x: cardData.focal_point_x || 50,
      focal_point_y: cardData.focal_point_y || 50,
      priority: cardData.priority || 'medium',
      points: cardData.points || 5,
    }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: cardData.title || '',
        description: cardData.description || '',
        icon_name: cardData.icon_name || cardData.iconName || '',
        icon_color: cardData.icon_color || '#FFFFFF',
        title_color: cardData.title_color || '#FFFFFF',
        subtext_color: cardData.subtext_color || '#8E9196',
        calendar_color: cardData.calendar_color || '#7E69AB',
        highlight_effect: cardData.highlight_effect || false,
        background_image_url: cardData.background_image_url || null,
        background_opacity: cardData.background_opacity || 100,
        focal_point_x: cardData.focal_point_x || 50,
        focal_point_y: cardData.focal_point_y || 50,
        priority: cardData.priority || 'medium',
        points: cardData.points || 5,
      });
      
      setImagePreview(cardData.background_image_url || null);
      setSelectedIconName(cardData.icon_name || cardData.iconName || null);
    }
  }, [isOpen, cardData, form]);

  const handleSave = async (values: any) => {
    setLoading(true);
    
    try {
      if (!values.title.trim()) {
        toast({
          title: "Error",
          description: "Title cannot be empty",
          variant: "destructive"
        });
        return;
      }
  
      const updatedData = {
        ...cardData,
        ...values,
        icon_name: selectedIconName,
      };
      
      await onSave(updatedData);
      
      toast({
        title: "Success",
        description: "Card updated successfully",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Error",
        description: "Failed to save card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(cardData.id);
      toast({
        title: "Card deleted",
        description: "The card has been successfully deleted",
      });
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

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
    form.setValue('background_image_url', null);
  };

  const handleIconSelect = (iconName: string) => {
    setSelectedIconName(iconName);
    setIconPreview(null);
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
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const handleRemoveIcon = () => {
    setSelectedIconName(null);
    setIconPreview(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-navy border border-light-navy text-white max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-white">Edit Throne Room Card</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-180px)] overflow-y-auto px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                {/* Basic Details */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Card title" 
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
                          placeholder="Card description" 
                          className="bg-dark-navy border-light-navy text-white min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Priority Selector */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Priority</FormLabel>
                      <FormControl>
                        <PrioritySelector
                          value={field.value || 'medium'}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Points Field */}
                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Points</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          placeholder="Points value" 
                          className="bg-dark-navy border-light-navy text-white" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Icon Section */}
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
                        onRemoveIcon={handleRemoveIcon}
                      />
                    </div>
                    
                    <PredefinedIconsGrid
                      selectedIconName={selectedIconName}
                      iconColor={form.watch('icon_color')}
                      onSelectIcon={handleIconSelect}
                    />
                  </div>
                </div>
                
                {/* Background Image */}
                <div className="space-y-4">
                  <FormLabel className="text-white text-lg">Background Image</FormLabel>
                  <BackgroundImageSelector
                    control={form.control}
                    imagePreview={imagePreview}
                    initialPosition={{ 
                      x: cardData.focal_point_x || 50, 
                      y: cardData.focal_point_y || 50 
                    }}
                    onRemoveImage={handleRemoveImage}
                    onImageUpload={handleImageUpload}
                    setValue={form.setValue}
                  />
                </div>
                
                {/* Color Settings */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ColorPickerField 
                    control={form.control} 
                    name="title_color" 
                    label="Title Color" 
                  />
                  
                  <ColorPickerField 
                    control={form.control} 
                    name="subtext_color" 
                    label="Subtext Color" 
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
                
                <FormField
                  control={form.control}
                  name="highlight_effect"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-white">Highlight Effect</FormLabel>
                        <p className="text-sm text-white opacity-70">Apply a yellow highlight behind title and description</p>
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
              </form>
            </Form>
          </ScrollArea>
            
          <DialogFooter className="px-6 py-4 border-t border-light-navy mt-4 flex justify-between">
            <div>
              {onDelete && (
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="bg-red-700 hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="border-red-600 bg-red-600 hover:bg-red-700 text-white"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={form.handleSubmit(handleSave)}
                disabled={loading}
                className="bg-nav-active text-white hover:bg-nav-active/80"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteTaskDialog 
        isOpen={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onDelete={handleDelete} 
      />
    </>
  );
};

export default ThroneRoomEditModal;
