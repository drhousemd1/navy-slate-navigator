import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { EncyclopediaEntry } from '@/types/encyclopedia';

import ColorPickerField from '@/components/task-editor/ColorPickerField';
import TextFormatToolbar from './formatting/TextFormatToolbar';
import ImageUploadSection from './image/ImageUploadSection';
import ImageFocalPointControl from './image/ImageFocalPointControl';
import OpacitySlider from './image/OpacitySlider';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface EditEncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EncyclopediaEntry) => void;
  onDelete?: (id: string) => void;
  entry?: EncyclopediaEntry;
  isSaving?: boolean;
  isDeleting?: boolean;
  onFormatSelection?: (selection: { start: number; end: number }) => void;
}

const EditEncyclopediaModal: React.FC<EditEncyclopediaModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete, 
  entry,
  isSaving = false,
  isDeleting = false,
  onFormatSelection
}) => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(entry?.image_url || null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [position, setPosition] = useState({ x: entry?.focal_point_x || 50, y: entry?.focal_point_y || 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [formattedSections, setFormattedSections] = useState<Array<{
    start: number;
    end: number;
    formatting: {
      isBold?: boolean;
      isUnderlined?: boolean;
      fontSize?: string;
    }
  }>>(entry?.formatted_sections || []);
  
  const form = useForm<EncyclopediaEntry>({
    defaultValues: {
      id: entry?.id || '',
      title: entry?.title || '',
      subtext: entry?.subtext || '',
      popup_text: entry?.popup_text || '',
      focal_point_x: entry?.focal_point_x || 50,
      focal_point_y: entry?.focal_point_y || 50,
      opacity: entry?.opacity || 100,
      popup_opacity: entry?.popup_opacity || entry?.opacity || 100,
      title_color: entry?.title_color || '#FFFFFF',
      subtext_color: entry?.subtext_color || '#D1D5DB',
      highlight_effect: entry?.highlight_effect || false,
      popup_text_formatting: entry?.popup_text_formatting || {
        isBold: false,
        isUnderlined: false,
        fontSize: '1rem'
      },
      formatted_sections: entry?.formatted_sections || []
    }
  });
  
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        form.reset({
          id: entry.id,
          title: entry.title,
          subtext: entry.subtext,
          popup_text: entry.popup_text || '',
          focal_point_x: entry.focal_point_x || 50,
          focal_point_y: entry.focal_point_y || 50,
          opacity: entry.opacity || 100,
          popup_opacity: entry.popup_opacity || entry.opacity || 100,
          title_color: entry.title_color || '#FFFFFF',
          subtext_color: entry.subtext_color || '#D1D5DB',
          highlight_effect: entry.highlight_effect || false,
          popup_text_formatting: entry.popup_text_formatting || {
            isBold: false,
            isUnderlined: false,
            fontSize: '1rem'
          },
          formatted_sections: entry?.formatted_sections || []
        });
        setFormattedSections(entry?.formatted_sections || []);
        setImagePreview(entry.image_url || null);
        setPosition({ x: entry.focal_point_x || 50, y: entry.focal_point_y || 50 });
      } else {
        form.reset({
          id: '',
          title: '',
          subtext: '',
          popup_text: '',
          focal_point_x: 50,
          focal_point_y: 50,
          opacity: 100,
          popup_opacity: 100,
          title_color: '#FFFFFF',
          subtext_color: '#D1D5DB',
          highlight_effect: false,
          popup_text_formatting: {
            isBold: false,
            isUnderlined: false,
            fontSize: '1rem'
          },
          formatted_sections: []
        });
        setFormattedSections([]);
        setImagePreview(null);
        setPosition({ x: 50, y: 50 });
      }
    }
  }, [isOpen, entry, form]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setImagePreview(null);
  };
  
  const onSubmit = (data: EncyclopediaEntry) => {
    const updatedEntry = {
      ...data,
      image_url: imagePreview,
      formatted_sections: formattedSections
    };
    
    onSave(updatedEntry);
  };

  const handleDelete = () => {
    if (entry && onDelete) {
      onDelete(entry.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number } | null>(null);

  const handleToggleBold = () => {
    if (selectedTextRange) {
      applyFormattingToSelectedText({ isBold: true });
    } else {
      const currentFormatting = form.getValues('popup_text_formatting') || {};
      form.setValue('popup_text_formatting', {
        ...currentFormatting,
        isBold: !currentFormatting.isBold
      });
    }
  };

  const handleToggleUnderline = () => {
    if (selectedTextRange) {
      applyFormattingToSelectedText({ isUnderlined: true });
    } else {
      const currentFormatting = form.getValues('popup_text_formatting') || {};
      form.setValue('popup_text_formatting', {
        ...currentFormatting,
        isUnderlined: !currentFormatting.isUnderlined
      });
    }
  };

  const handleFontSizeChange = (value: string) => {
    if (selectedTextRange) {
      applyFormattingToSelectedText({ fontSize: value });
    } else {
      const currentFormatting = form.getValues('popup_text_formatting') || {};
      form.setValue('popup_text_formatting', {
        ...currentFormatting,
        fontSize: value
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    setIsDragging(true);
    updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    const imageContainer = document.getElementById('focal-point-container');
    if (!imageContainer) return;
    
    const rect = imageContainer.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
    form.setValue('focal_point_x', Math.round(x));
    form.setValue('focal_point_y', Math.round(y));
  };

  const handleTextSelection = (selection: { start: number; end: number }) => {
    setSelectedTextRange(selection);
    if (onFormatSelection) {
      onFormatSelection(selection);
    }
  };

  const applyFormattingToSelectedText = (
    formatting: { isBold?: boolean; isUnderlined?: boolean; fontSize?: string }
  ) => {
    if (!selectedTextRange) return;
    
    const { start, end } = selectedTextRange;
    
    const newFormattedSection = {
      start,
      end,
      formatting: { ...formatting }
    };
    
    const updatedSections = [...formattedSections, newFormattedSection];
    setFormattedSections(updatedSections);
    
    form.setValue('formatted_sections', updatedSections);
    
    setSelectedTextRange(null);
    
    console.log(`Applied formatting to text from ${start} to ${end}:`, formatting);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updatePosition(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        e.preventDefault();
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const stopDragging = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopDragging);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging]);
  
  const currentTextFormatting = form.watch('popup_text_formatting') || {};
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-navy border border-light-navy text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {entry ? 'Edit Encyclopedia Entry' : 'Create Encyclopedia Entry'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="subtext"
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
              
              <div className="space-y-2">
                <FormLabel className="text-white">Pop-up Text</FormLabel>
                
                <TextFormatToolbar 
                  selectedTextRange={selectedTextRange}
                  currentFormatting={currentTextFormatting}
                  onToggleBold={handleToggleBold}
                  onToggleUnderline={handleToggleUnderline}
                  onFontSizeChange={handleFontSizeChange}
                />
                
                <FormField
                  control={form.control}
                  name="popup_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter text to show in full-screen pop-up" 
                          className="bg-dark-navy border-light-navy text-white"
                          formattedPreview={true}
                          textFormatting={currentTextFormatting}
                          onFormatSelection={handleTextSelection}
                          formattedSections={formattedSections}
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <div className="text-white font-medium text-sm">Text Colors</div>
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
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="highlight_effect"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Highlight Effect</FormLabel>
                      <p className="text-sm text-white">Apply a yellow highlight behind title and description</p>
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
              
              <ImageUploadSection
                imagePreview={imagePreview}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
              >
                {imagePreview && (
                  <ImageFocalPointControl
                    imagePreview={imagePreview}
                    position={position}
                    opacity={form.watch('opacity')}
                    isDragging={isDragging}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                  />
                )}
              </ImageUploadSection>
              
              {imagePreview && (
                <div className="space-y-4">
                  <OpacitySlider 
                    control={form.control}
                    name="opacity"
                    label="Tile Image Opacity"
                  />
                  
                  <OpacitySlider 
                    control={form.control}
                    name="popup_opacity"
                    label="Popup Image Opacity"
                  />
                </div>
              )}
              
              <DialogFooter className="pt-4 space-x-2">
                {entry && onDelete && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="mr-auto bg-red-700 hover:bg-red-800"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                    ) : (
                      <><Trash2 className="mr-2 h-4 w-4" /> Delete</>
                    )}
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-nav-active text-white hover:bg-nav-active/80"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default EditEncyclopediaModal;
