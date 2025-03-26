import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, Upload, Bold, Underline, AlignLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import { Switch } from "@/components/ui/switch";
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditEncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EncyclopediaEntry) => void;
  onDelete?: (id: string) => void;
  entry?: EncyclopediaEntry;
  isSaving?: boolean;
  isDeleting?: boolean;
}

const EditEncyclopediaModal: React.FC<EditEncyclopediaModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete, 
  entry,
  isSaving = false,
  isDeleting = false
}) => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(entry?.image_url || null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [position, setPosition] = useState({ x: entry?.focal_point_x || 50, y: entry?.focal_point_y || 50 });
  const [isDragging, setIsDragging] = useState(false);
  
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
      }
    }
  });
  
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        // Editing existing entry
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
          }
        });
        setImagePreview(entry.image_url || null);
        setPosition({ x: entry.focal_point_x || 50, y: entry.focal_point_y || 50 });
      } else {
        // Creating new entry
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
          }
        });
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
      image_url: imagePreview
    };
    
    onSave(updatedEntry);
  };

  const handleDelete = () => {
    if (entry && onDelete) {
      onDelete(entry.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleBold = () => {
    const currentFormatting = form.getValues('popup_text_formatting') || {};
    form.setValue('popup_text_formatting', {
      ...currentFormatting,
      isBold: !currentFormatting.isBold
    });
  };

  const handleToggleUnderline = () => {
    const currentFormatting = form.getValues('popup_text_formatting') || {};
    form.setValue('popup_text_formatting', {
      ...currentFormatting,
      isUnderlined: !currentFormatting.isUnderlined
    });
  };

  const handleFontSizeChange = (value: string) => {
    const currentFormatting = form.getValues('popup_text_formatting') || {};
    form.setValue('popup_text_formatting', {
      ...currentFormatting,
      fontSize: value
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
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-navy border border-light-navy text-white">
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
                
                <div className="bg-dark-navy border border-light-navy rounded-md p-2 mb-2 flex flex-wrap gap-2">
                  <ToggleGroup type="multiple" className="justify-start">
                    <ToggleGroupItem 
                      value="bold" 
                      aria-label="Toggle bold"
                      className={form.watch('popup_text_formatting.isBold') ? "bg-nav-active" : ""}
                      onClick={handleToggleBold}
                    >
                      <Bold className="h-4 w-4" />
                    </ToggleGroupItem>
                    
                    <ToggleGroupItem 
                      value="underline" 
                      aria-label="Toggle underline"
                      className={form.watch('popup_text_formatting.isUnderlined') ? "bg-nav-active" : ""}
                      onClick={handleToggleUnderline}
                    >
                      <Underline className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  
                  <Select
                    value={form.watch('popup_text_formatting.fontSize') || '1rem'}
                    onValueChange={handleFontSizeChange}
                  >
                    <SelectTrigger className="w-32 bg-dark-navy border-light-navy text-white">
                      <SelectValue placeholder="Font size" />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-navy border-light-navy text-white">
                      <SelectItem value="0.875rem">Small</SelectItem>
                      <SelectItem value="1rem">Medium</SelectItem>
                      <SelectItem value="1.25rem">Large</SelectItem>
                      <SelectItem value="1.5rem">X-Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <FormField
                  control={form.control}
                  name="popup_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter text to show in full-screen pop-up" 
                          className="bg-dark-navy border-light-navy text-white"
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-light-navy">
                        Text will appear with the formatting options selected above
                      </FormDescription>
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
              
              <div className="space-y-4">
                <FormLabel className="text-white">Background Image</FormLabel>
                
                <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div 
                        id="focal-point-container"
                        className="relative w-full h-48 rounded-lg overflow-hidden"
                        role="button"
                        tabIndex={0}
                        aria-label="Drag to adjust focal point"
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                      >
                        <img 
                          src={imagePreview} 
                          alt="Background preview" 
                          className="w-full h-full object-cover"
                          style={{ 
                            opacity: form.watch('opacity') / 100,
                            objectPosition: `${position.x}% ${position.y}%`
                          }}
                        />
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-200"
                          style={{ 
                            cursor: 'crosshair',
                            pointerEvents: 'auto', 
                            touchAction: 'none',
                            zIndex: 10,
                          }}
                        >
                          <div 
                            className="absolute w-8 h-8 bg-white rounded-full border-2 border-nav-active transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                            style={{ 
                              left: `${position.x}%`, 
                              top: `${position.y}%`,
                              animation: isDragging ? 'none' : 'pulse 2s infinite',
                              boxShadow: isDragging ? '0 0 0 4px rgba(126, 105, 171, 0.5)' : '',
                              zIndex: 20,
                              pointerEvents: 'none' 
                            }}
                          />
                          <span className="text-sm text-white bg-black/70 px-3 py-2 rounded-full shadow-md pointer-events-none">
                            Click and drag to adjust focal point
                          </span>
                        </div>
                      </div>
                      <Button 
                        type="button"
                        variant="secondary" 
                        onClick={handleRemoveImage}
                        className="bg-dark-navy text-white hover:bg-light-navy"
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className="relative h-32 flex flex-col items-center justify-center">
                      <Upload className="h-10 w-10 text-light-navy mb-2" />
                      <p className="text-light-navy">Click to upload or drag and drop</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleImageUpload}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {imagePreview && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="opacity"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-white">Tile Image Opacity ({field.value}%)</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="popup_opacity"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-white">Popup Image Opacity ({field.value}%)</FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                      </FormItem>
                    )}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-navy border border-light-navy text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this encyclopedia entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-light-navy text-white hover:bg-light-navy">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditEncyclopediaModal;
