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
import { useModalIconHandling } from '@/components/admin-testing/edit-modal/hooks/useModalIconHandling';
import { supabase } from '@/integrations/supabase/client'; // For Supabase storage
import { getIconByName } from '@/lib/iconUtils';
import { CardDisplay } from '@/components/throne/ThroneRoomCard';
import { APP_CONFIG } from '@/config/constants';
import { logger } from '@/lib/logger'; // Added logger

type FormattedSection = NonNullable<EncyclopediaEntry['formatted_sections']>[number];

export interface CardDisplayProps {
    id: string;
    title: string;
    subtext?: string | null;
    points?: number | null;
    icon?: string | null;
    iconUrl?: string | null;
    iconColor?: string;
    titleColor?: string;
    subtextColor?: string;
    calendarColor?: string;
    backgroundImageUrl?: string | null;
    backgroundOpacity?: number;
    highlightEffect?: boolean;
    focalPointX?: number;
    focalPointY?: number;
    cardType: 'task' | 'reward' | 'rule' | 'punishment' | 'encyclopedia';
}

interface ThroneRoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: CardDisplayProps | null;
  onSave: (updatedCardData: CardDisplayProps) => void;
  cardType: 'task' | 'reward' | 'rule' | 'punishment' | 'encyclopedia';
  userId?: string; // For uploading images to user-specific paths
}

const ThroneRoomEditModal: React.FC<ThroneRoomEditModalProps> = ({ 
  isOpen, 
  onClose, 
  cardData: initialData, 
  onSave,
  cardType,
  userId = APP_CONFIG.genericUserIdForStorage, // Default to generic if no user ID
}) => {
  const [formData, setFormData] = useState<Partial<CardDisplayProps>>({});
  const [isUploading, setIsUploading] = useState(false);

  const { 
    imagePreview, 
    imageFile, 
    handleImageUpload: triggerImageUpload, 
    handleRemoveImage,
    setImagePreview: setImagePreviewFromUrl // Hook's function to set image from URL
  } = useModalImageHandling(initialData?.backgroundImageUrl);

  const { 
    iconPreview, // This is the URL for custom uploaded icons
    selectedIconName, // This is for predefined Lucide icons
    handleIconUpload: triggerIconUpload, 
    handleIconSelect, 
    handleRemoveIcon,
    setIconPreview: setIconPreviewFromUrl, // Hook's function to set icon from URL
    setSelectedIconName: setSelectedIconNameFromData, // Hook's function to set icon name
  } = useModalIconHandling(initialData?.iconUrl, initialData?.icon);

  useEffect(() => {
    logger.log("Initial data for ThroneRoomEditModal:", initialData);
    if (initialData) {
      setFormData({ ...initialData });
      // Set previews using the hooks' setters
      setImagePreviewFromUrl(initialData.backgroundImageUrl || null);
      if (initialData.iconUrl) {
        setIconPreviewFromUrl(initialData.iconUrl); // If direct URL
        setSelectedIconNameFromData(null); // Clear selected Lucide icon name
      } else if (initialData.icon) {
        setSelectedIconNameFromData(initialData.icon); // If Lucide icon name
        setIconPreviewFromUrl(null); // Clear custom icon URL
      } else {
        setSelectedIconNameFromData(null);
        setIconPreviewFromUrl(null);
      }
    } else {
      // Reset for a new card (though this modal is likely always for editing existing)
      setFormData({});
      setImagePreviewFromUrl(null);
      setIconPreviewFromUrl(null);
      setSelectedIconNameFromData(null);
    }
  }, [initialData, setImagePreviewFromUrl, setIconPreviewFromUrl, setSelectedIconNameFromData]);


  const handleChange = (field: keyof CardDisplayProps, value: any) => {
    logger.debug("Updated field:", field, "value:", value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSliderChange = (field: keyof CardDisplayProps, value: number[]) => {
    handleChange(field, value[0]);
  };

  const handleCheckboxChange = (field: keyof CardDisplayProps, checked: boolean) => {
    handleChange(field, checked);
  };

  const uploadFileToSupabase = async (file: File, pathPrefix: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pathPrefix}/${userId}/${Date.now()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('app_images') // Centralized bucket
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('app_images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      logger.error(`Error uploading ${pathPrefix} image:`, error); // Replaced console.error
      toast({ title: 'Upload Error', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally {
      setIsUploading(false);
    }
  };


  const handleSave = async () => {
    let finalBackgroundImageUrl = imagePreview; // Could be existing URL or base64
    if (imageFile) { // A new background image was selected/uploaded by user
      const uploadedUrl = await uploadFileToSupabase(imageFile, 'card_backgrounds');
      if (!uploadedUrl) return; // Stop if upload failed
      finalBackgroundImageUrl = uploadedUrl;
    }

    let finalIconUrl: string | undefined = formData.iconUrl; // Prioritize existing formData URL
    let finalIconName: string | undefined = selectedIconName || undefined; // formData.icon might be stale if selectedIconName changed

    if (iconPreview && !selectedIconName) { // Custom icon was uploaded (iconPreview is base64 or new URL)
        // Check if iconPreview is a new base64 upload or an existing URL
        if (iconPreview.startsWith('data:image')) { // It's a new base64 upload
             // This assumes useModalIconHandling already converted the uploaded file to iconPreview (base64)
             // For ThroneRoom, we might need to handle the actual File object if not using a hook that does this.
             // For simplicity, let's assume iconPreview *could* be a base64 string needing upload, or an existing URL.
             // This part needs careful handling based on how useModalIconHandling gives us the icon.
             // If `useModalIconHandling` returns a `File` object for new uploads, that's what we need.
             // For now, let's assume if iconPreview is set and selectedIconName is null, it's a custom icon path.
             // This logic needs to be robust based on what useModalIconHandling provides.
             // If iconPreview is a base64 string (meaning a new custom icon was chosen client-side and needs upload)
             // This part is tricky as useModalIconHandling's example implementation directly sets iconPreview to base64.
             // A better approach would be for useModalIconHandling to also give us the File object.
             // For now, we'll assume if iconPreview is base64, it needs uploading.
             // This might require modification if useModalIconHandling changes.
             // This is a simplified placeholder for robust custom icon upload:
             // if (iconPreview.startsWith('data:image')) { /* TODO: Convert base64 to file and upload */ }
             finalIconUrl = iconPreview; // If it's already a URL (e.g. custom URL pasted or from prior upload)
             finalIconName = undefined; // Custom URL means no Lucide icon name
        } else {
            // iconPreview is an existing URL, no new upload needed for it
            finalIconUrl = iconPreview;
            finalIconName = undefined;
        }
    } else if (selectedIconName) { // A Lucide icon was selected
        finalIconUrl = undefined; // No custom URL
        finalIconName = selectedIconName;
    } else { // No icon or icon removed
        finalIconUrl = undefined;
        finalIconName = undefined;
    }


    const updatedCardData: CardDisplayProps = {
      ...initialData, // Spread initial data to preserve id and any fields not in the form
      ...formData,
      id: initialData?.id || formData.id || '', // Ensure ID is preserved
      title: formData.title || initialData?.title || 'Untitled',
      backgroundImageUrl: finalBackgroundImageUrl,
      icon: finalIconName,
      iconUrl: finalIconUrl,
      cardType: cardType, // ensure cardType is passed through
    };
    logger.log("Form submitted with data:", updatedCardData);
    onSave(updatedCardData);
    onClose();
  };
  
  // If no initial data when modal is open, perhaps show loading or error, or close.
  // For this component, it's expected to always have initialData if open.
  if (!isOpen) return null;
  if (!initialData && isOpen) {
    // This case should ideally not happen if used correctly.
    // Consider closing or showing an error.
    logger.warn("ThroneRoomEditModal opened without initialData.");
    onClose(); // Close if no data
    return null;
  }
  
  const currentCardDisplayData: CardDisplayProps = {
    id: initialData?.id || formData.id || '',
    title: formData.title || initialData?.title || '',
    subtext: formData.subtext || initialData?.subtext,
    points: formData.points || initialData?.points,
    icon: selectedIconName || formData.icon || initialData?.icon,
    iconUrl: iconPreview || formData.iconUrl || initialData?.iconUrl, // Show live preview of icon
    iconColor: formData.iconColor || initialData?.iconColor || '#FFFFFF',
    titleColor: formData.titleColor || initialData?.titleColor || '#FFFFFF',
    subtextColor: formData.subtextColor || initialData?.subtextColor || '#CCCCCC',
    calendarColor: formData.calendarColor || initialData?.calendarColor || '#7E69AB',
    backgroundImageUrl: imagePreview || formData.backgroundImageUrl || initialData?.backgroundImageUrl, // Show live preview
    backgroundOpacity: formData.backgroundOpacity ?? initialData?.backgroundOpacity ?? 100,
    highlightEffect: formData.highlightEffect ?? initialData?.highlightEffect ?? false,
    focalPointX: formData.focalPointX ?? initialData?.focalPointX ?? 50,
    focalPointY: formData.focalPointY ?? initialData?.focalPointY ?? 50,
    cardType: cardType,
    // Include other fields that might be part of CardDisplayProps
    // For example, if a 'status' or 'type' field is visually relevant on the card preview
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Card Appearance: {initialData?.title}</DialogTitle>
          <DialogDescription>
            Customize the visual style of this {cardType} card. Changes are previewed below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 flex-grow overflow-hidden">
          {/* Left Column: Form Inputs */}
          <div className="space-y-4 overflow-y-auto pr-2 pb-4"> {/* Added pb-4 for scroll spacing */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="subtext">Subtext</Label>
              <Input id="subtext" value={formData.subtext || ''} onChange={(e) => handleChange('subtext', e.target.value)} />
            </div>
             {cardType !== 'encyclopedia' && ( // Points may not apply to encyclopedia
              <div>
                <Label htmlFor="points">Points / Cost</Label>
                <Input id="points" type="number" value={formData.points || 0} onChange={(e) => handleChange('points', parseInt(e.target.value) || 0)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Background Image</Label>
              <ImageUploadPlaceholder 
                imagePreview={imagePreview}
                onImageUpload={triggerImageUpload} // Use the trigger from the hook
                onRemoveImage={handleRemoveImage}
                uploadButtonText="Upload Background"
              />
            </div>

            {imagePreview && (
              <>
                <div>
                  <Label>Background Opacity ({formData.backgroundOpacity ?? 100}%)</Label>
                  <Slider value={[formData.backgroundOpacity ?? 100]} onValueChange={(val) => handleSliderChange('backgroundOpacity', val)} min={0} max={100} step={1} />
                </div>
                <div>
                  <Label>Focal Point X ({formData.focalPointX ?? 50}%)</Label>
                  <Slider value={[formData.focalPointX ?? 50]} onValueChange={(val) => handleSliderChange('focalPointX', val)} min={0} max={100} step={1} />
                </div>
                <div>
                  <Label>Focal Point Y ({formData.focalPointY ?? 50}%)</Label>
                  <Slider value={[formData.focalPointY ?? 50]} onValueChange={(val) => handleSliderChange('focalPointY', val)} min={0} max={100} step={1} />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker 
                selectedIconName={selectedIconName}
                customIconPreview={iconPreview} // URL of custom uploaded icon
                onSelectIcon={handleIconSelect} // For Lucide icons
                onUploadIcon={triggerIconUpload} // For custom icons
                onRemoveIcon={handleRemoveIcon}
                iconColor={formData.iconColor || '#FFFFFF'} // Pass current color for preview
              />
            </div>


            <div>
              <Label>Icon Color</Label>
              <ColorPicker color={formData.iconColor || '#FFFFFF'} onChange={(color) => handleChange('iconColor', color)} />
            </div>
            <div>
              <Label>Title Color</Label>
              <ColorPicker color={formData.titleColor || '#FFFFFF'} onChange={(color) => handleChange('titleColor', color)} />
            </div>
            <div>
              <Label>Subtext Color</Label>
              <ColorPicker color={formData.subtextColor || '#CCCCCC'} onChange={(color) => handleChange('subtextColor', color)} />
            </div>
            <div>
              <Label>Calendar Color (for tasks/rules)</Label>
              <ColorPicker color={formData.calendarColor || '#7E69AB'} onChange={(color) => handleChange('calendarColor', color)} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="highlightEffect" 
                checked={formData.highlightEffect || false} 
                onCheckedChange={(checked) => handleCheckboxChange('highlightEffect', Boolean(checked))} 
              />
              <Label htmlFor="highlightEffect">Enable Hover Highlight</Label>
            </div>
          </div>

          {/* Right Column: Live Preview */}
          <div className="flex flex-col items-center justify-center bg-muted/30 p-4 rounded-lg overflow-hidden">
            <Label className="mb-2 text-sm text-muted-foreground self-start">Live Preview</Label>
            <div className="w-full max-w-[300px] aspect-[3/4] flex items-center justify-center">
              {/* Render the appropriate card component based on cardType */}
              <CardDisplay {...currentCardDisplayData} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThroneRoomEditModal;
