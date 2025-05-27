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
import { logger } from '@/lib/logger';

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
  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number } | null>(null);
  const editorRef = React.useRef<HTMLDivElement>(null); // Added editorRef for Textarea
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
      popup_opacity: entry?.popup_opacity || (entry?.opacity || 100),
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
          popup_opacity: entry.popup_opacity || (entry.opacity || 100),
          title_color: entry.title_color || '#FFFFFF',
          subtext_color: entry.subtext_color || '#D1D5DB',
          highlight_effect: entry.highlight_effect || false,
          popup_text_formatting: entry.popup_text_formatting || {
            isBold: false,
            isUnderlined: false,
            fontSize: '1rem'
          },
          formatted_sections: entry.formatted_sections || []
        });
        setFormattedSections(entry.formatted_sections || []);
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

  // Helper function to apply formatting using document.execCommand
  const applyFormatCommand = (command: string, value?: string) => {
    if (editorRef.current) {
        // Ensure focus on the editor before executing command
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (!editorRef.current.contains(range.commonAncestorContainer)) {
                 // If selection is outside the editor, try to focus the editor
                 // This might reset selection, consider more robust focusing if needed
                editorRef.current.focus();
            }
        } else {
            editorRef.current.focus();
        }
    }
    document.execCommand('styleWithCSS', false, "true"); // Use CSS styles
    document.execCommand(command, false, value);
    if (editorRef.current) {
      form.setValue('popup_text', editorRef.current.innerHTML);
    }
  };

  const handleToggleBold = () => {
    applyFormatCommand('bold');
    const currentFormatting = form.getValues('popup_text_formatting') || {};
    form.setValue('popup_text_formatting', {
        ...currentFormatting,
        isBold: document.queryCommandState('bold') 
    });
  };

  const handleToggleUnderline = () => {
    applyFormatCommand('underline');
    const currentFormatting = form.getValues('popup_text_formatting') || {};
    form.setValue('popup_text_formatting', {
        ...currentFormatting,
        isUnderlined: document.queryCommandState('underline')
    });
  };

  const handleFontSizeChange = (size: string) => {
    document.execCommand("fontSize", false, "1"); // Set to a known small size
    const fontElements = editorRef.current?.querySelectorAll("font[size='1']");
    fontElements?.forEach(el => {
      const spanStyled = document.createElement('span');
      spanStyled.style.fontSize = size;
      spanStyled.innerHTML = el.innerHTML;
      el.parentNode?.replaceChild(spanStyled, el);
    });
    if (editorRef.current) {
      form.setValue('popup_text', editorRef.current.innerHTML);
    }
    const currentFormatting = form.getValues('popup_text_formatting') || {};
    form.setValue('popup_text_formatting', {
        ...currentFormatting,
        fontSize: size
    });
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
    logger.debug("Text selected (manual tracking):", selection);
    setSelectedTextRange(selection);
    if (onFormatSelection) {
      onFormatSelection(selection);
    }
  };

  // applyFormattingToSelectedText is not directly needed if using execCommand,
  // but formattedSections might be used for other purposes or a different rich text approach.
  // For now, let's assume formattedSections is for data persistence and not direct Textarea control.
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
    
    logger.debug("Applying formatting (manual tracking):", newFormattedSection);
    
    const updatedSections = [...formattedSections, newFormattedSection];
    setFormattedSections(updatedSections); // Update local state
    
    form.setValue('formatted_sections', updatedSections); // Update form state
    
    setSelectedTextRange(null);
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
  
  // Watch the general formatting state for the toolbar indicators
  const currentTextFormatting = form.watch('popup_text_formatting') || {
    isBold: false,
    isUnderlined: false,
    fontSize: '1rem'
  };

  // Update toolbar based on actual selection
  useEffect(() => {
    const updateToolbarStatus = () => {
      if (editorRef.current && editorRef.current.contains(document.activeElement)) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            // Simplified: check command state for bold/underline
            // For font size/alignment, it's more complex to get accurately from selection.
            // This part might need a more robust solution for fully accurate toolbar state.
            form.setValue('popup_text_formatting.isBold', document.queryCommandState('bold'));
            form.setValue('popup_text_formatting.isUnderlined', document.queryCommandState('underline'));
            // Font size and alignment detection from selection is tricky.
            // The TextFormatToolbar will primarily reflect the *intended* next style or the overall style.
        }
      }
    };
    document.addEventListener('selectionchange', updateToolbarStatus);
    editorRef.current?.addEventListener('focus', updateToolbarStatus);
    editorRef.current?.addEventListener('input', updateToolbarStatus); // Update on input as well

    return () => {
      document.removeEventListener('selectionchange', updateToolbarStatus);
      editorRef.current?.removeEventListener('focus', updateToolbarStatus);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      editorRef.current?.removeEventListener('input', updateToolbarStatus);
    };
  }, [form]);

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
                  selectedTextRange={selectedTextRange} // This prop might be less relevant now with execCommand
                  currentFormatting={currentTextFormatting}
                  onToggleBold={handleToggleBold}
                  onToggleUnderline={handleToggleUnderline}
                  onFontSizeChange={handleFontSizeChange}
                  // Add other formatting handlers if TextFormatToolbar has them
                />
                
                <FormField
                  control={form.control}
                  name="popup_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter text to show in full-screen pop-up" 
                          className="bg-dark-navy border-light-navy text-white min-h-[200px]" // Added min-h
                          formattedPreview={true}
                          editorRef={editorRef} // Pass the ref here
                          // Remove unsupported props: textFormatting, onFormatSelection, formattedSections
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          // ref={field.ref} // The main ref is handled by editorRef for contentEditable
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
