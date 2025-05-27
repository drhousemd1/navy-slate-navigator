
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useCreateEncyclopediaEntry, useUpdateEncyclopediaEntry } from '@/data/encyclopedia/mutations';
import ColorPicker from '@/components/ui/color-picker'; // Assuming ColorPicker component exists
import ImageUploadPlaceholder from '@/components/ui/image-upload-placeholder'; // Assuming this component
import { useModalImageHandling } from '@/components/admin-testing/edit-modal/hooks/useModalImageHandling'; // For image handling
import { supabase } from '@/integrations/supabase/client'; // For Supabase storage
import { logger } from '@/lib/logger'; // Added logger

type FormattedSection = NonNullable<EncyclopediaEntry['formatted_sections']>[number];

interface EditEncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: EncyclopediaEntry | null;
  onSave: (entry: EncyclopediaEntry) => void;
}

const EditEncyclopediaModal: React.FC<EditEncyclopediaModalProps> = ({ isOpen, onClose, entry, onSave }) => {
  const [title, setTitle] = useState('');
  const [subtext, setSubtext] = useState('');
  const [popupText, setPopupText] = useState('');
  const [focalPointX, setFocalPointX] = useState(50);
  const [focalPointY, setFocalPointY] = useState(50);
  const [opacity, setOpacity] = useState(100);
  const [popupOpacity, setPopupOpacity] = useState(100);
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [subtextColor, setSubtextColor] = useState('#CCCCCC');
  const [highlightEffect, setHighlightEffect] = useState(false);
  // formatted_sections and popup_text_formatting would need more complex UI elements

  const { 
    imagePreview, 
    imageFile, 
    handleImageUpload, 
    handleRemoveImage,
    setImagePreview // Allow direct setting for existing URLs
  } = useModalImageHandling(entry?.image_url);

  const createEntryMutation = useCreateEncyclopediaEntry();
  const updateEntryMutation = useUpdateEncyclopediaEntry();

  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    logger.log("Entry to edit:", entry);
    if (entry) {
      setTitle(entry.title);
      setSubtext(entry.subtext || '');
      setPopupText(entry.popup_text || '');
      setImagePreview(entry.image_url || null); // Use setImagePreview from hook
      setFocalPointX(entry.focal_point_x || 50);
      setFocalPointY(entry.focal_point_y || 50);
      setOpacity(entry.opacity || 100);
      setPopupOpacity(entry.popup_opacity || entry.opacity || 100);
      setTitleColor(entry.title_color || '#FFFFFF');
      setSubtextColor(entry.subtext_color || '#CCCCCC');
      setHighlightEffect(entry.highlight_effect || false);
    } else {
      // Reset form for new entry
      setTitle('');
      setSubtext('');
      setPopupText('');
      setImagePreview(null);
      setFocalPointX(50);
      setFocalPointY(50);
      setOpacity(100);
      setPopupOpacity(100);
      setTitleColor('#FFFFFF');
      setSubtextColor('#CCCCCC');
      setHighlightEffect(false);
    }
  }, [entry, setImagePreview]);

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `encyclopedia/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('app_images') // Assuming a common bucket or a specific one like 'encyclopedia_images'
        .upload(fileName, file);

      if (error) {
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('app_images')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      logger.error('Error uploading image to Supabase:', error); // Replaced console.error
      toast({ title: 'Image Upload Error', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally {
      setIsUploading(false);
    }
  };


  const handleSubmit = async () => {
    let finalImageUrl = imagePreview; // Existing URL or base64 preview
    if (imageFile) { // If a new file was selected
      const uploadedUrl = await uploadImageToSupabase(imageFile);
      if (!uploadedUrl) return; // Stop if upload failed
      finalImageUrl = uploadedUrl;
    }


    const entryData: Partial<Omit<EncyclopediaEntry, 'id' | 'formatted_sections' | 'popup_text_formatting'>> & {
      id?: string; // id is optional for create
      formatted_sections?: FormattedSection[]; // Keeping for type consistency
      popup_text_formatting?: EncyclopediaEntry['popup_text_formatting']; // Keeping for type consistency
    } = {
      title,
      subtext,
      popup_text: popupText,
      image_url: finalImageUrl,
      focal_point_x: focalPointX,
      focal_point_y: focalPointY,
      opacity,
      popup_opacity: popupOpacity,
      title_color: titleColor,
      subtext_color: subtextColor,
      highlight_effect: highlightEffect,
      // formatted_sections and popup_text_formatting would be set here if UI existed
    };
    logger.log("Submitting form with data:", entryData);

    try {
      let savedEntry: EncyclopediaEntry;
      if (entry?.id) {
        savedEntry = await updateEntryMutation.mutateAsync({ id: entry.id, ...entryData });
      } else {
        // Ensure all required fields for creation are present. Supabase might have defaults.
        savedEntry = await createEntryMutation.mutateAsync(entryData as Omit<EncyclopediaEntry, 'id' | 'created_at' | 'updated_at'>);
      }
      onSave(savedEntry);
      onClose();
    } catch (error) {
      // Error toast is handled by the optimistic mutation hooks
      logger.error('Error saving encyclopedia entry:', error); // Replaced console.error
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Encyclopedia Entry' : 'Create Encyclopedia Entry'}</DialogTitle>
          <DialogDescription>
            {entry ? `Modify the details for "${entry.title}".` : "Fill in the details for the new encyclopedia entry."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto flex-grow pr-2">
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="subtext">Subtext (Displayed on Card)</Label>
            <Textarea id="subtext" value={subtext} onChange={(e) => setSubtext(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="popupText">Popup Text (Detailed View)</Label>
            <Textarea id="popupText" value={popupText} onChange={(e) => setPopupText(e.target.value)} rows={5} />
          </div>
          
          <div className="space-y-2">
            <Label>Card Image</Label>
            <ImageUploadPlaceholder 
              imagePreview={imagePreview}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              uploadButtonText="Upload Card Image"
              className="w-full h-48" // Adjust size as needed
            />
          </div>

          {imagePreview && (
            <>
              <div className="space-y-1">
                <Label htmlFor="focalPointX">Image Focal Point X ({focalPointX}%)</Label>
                <Slider id="focalPointX" value={[focalPointX]} onValueChange={([val]) => setFocalPointX(val)} min={0} max={100} step={1} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="focalPointY">Image Focal Point Y ({focalPointY}%)</Label>
                <Slider id="focalPointY" value={[focalPointY]} onValueChange={([val]) => setFocalPointY(val)} min={0} max={100} step={1} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opacity">Card Background Opacity ({opacity}%)</Label>
                <Slider id="opacity" value={[opacity]} onValueChange={([val]) => setOpacity(val)} min={0} max={100} step={1} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="popupOpacity">Popup Background Opacity ({popupOpacity}%)</Label>
                <Slider id="popupOpacity" value={[popupOpacity]} onValueChange={([val]) => setPopupOpacity(val)} min={0} max={100} step={1} />
              </div>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="titleColor">Title Color</Label>
              <ColorPicker color={titleColor} onChange={setTitleColor} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="subtextColor">Subtext Color</Label>
              <ColorPicker color={subtextColor} onChange={setSubtextColor} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="highlightEffect" checked={highlightEffect} onCheckedChange={(checked) => setHighlightEffect(Boolean(checked))} />
            <Label htmlFor="highlightEffect" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enable Hover Highlight Effect
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createEntryMutation.isPending || updateEntryMutation.isPending || isUploading}>
            {isUploading ? 'Uploading...' : (entry ? 'Save Changes' : 'Create Entry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditEncyclopediaModal;
