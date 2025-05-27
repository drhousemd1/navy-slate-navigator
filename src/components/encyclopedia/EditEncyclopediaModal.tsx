
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { encyclopediaEntrySchema, EncyclopediaEntryFormValues } from './encyclopediaFormSchema'; // Assuming you have this
import { supabase } from '@/integrations/supabase/client'; // For direct Supabase calls if needed
import { toast } from '@/hooks/use-toast';
import { ChromePicker, ColorResult } from 'react-color'; // For color pickers
import { Switch } from '@/components/ui/switch';
import ImageUploader from '@/components/ImageUploader'; // Generic image uploader
import { useUpdateEncyclopediaEntry, useCreateEncyclopediaEntry, useDeleteEncyclopediaEntry } from '@/data/encyclopedia/mutations';
import { Loader2, Trash2 } from 'lucide-react';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'; // Generic delete dialog
import FocalPointPicker from '@/components/FocalPointPicker'; // Assuming this component exists
import { logger } from '@/lib/logger';


interface EditEncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: EncyclopediaEntry | null; // Entry to edit, or null/undefined for new entry
}

const EditEncyclopediaModal: React.FC<EditEncyclopediaModalProps> = ({ isOpen, onClose, entry }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageFileToUpload, setImageFileToUpload] = useState<File | null>(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(entry?.image_url || null);

  const createMutation = useCreateEncyclopediaEntry();
  const updateMutation = useUpdateEncyclopediaEntry();
  const deleteMutation = useDeleteEncyclopediaEntry();

  const { control, handleSubmit, register, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<EncyclopediaEntryFormValues>({
    resolver: zodResolver(encyclopediaEntrySchema),
    defaultValues: entry 
      ? { ...encyclopediaEntrySchema.parse(entry) } // Ensure default values also pass schema validation
      : encyclopediaEntrySchema.parse({}), // Use Zod's default for new entries
  });
  
  const backgroundOpacity = watch('opacity', entry?.opacity || 50);
  const popupOpacity = watch('popup_opacity', entry?.popup_opacity || entry?.opacity || 50);

  useEffect(() => {
    if (entry) {
      const validEntryDefaults = encyclopediaEntrySchema.parse(entry); // Parse to ensure defaults are valid
      reset(validEntryDefaults);
      setCurrentImagePreview(entry.image_url || null);
    } else {
      reset(encyclopediaEntrySchema.parse({})); // Reset with Zod defaults for new entry
      setCurrentImagePreview(null);
    }
    setImageFileToUpload(null); // Clear any pending file upload
  }, [entry, reset]);


  const handleImageSelected = (file: File | null, previewUrl: string | null) => {
    setImageFileToUpload(file);
    setCurrentImagePreview(previewUrl);
    setValue('image_url', previewUrl || ''); // Store preview URL temporarily, will be replaced by server URL
    logger.log("Image selected/changed in modal. Preview:", previewUrl);
  };
  
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `encyclopedia/${Date.now()}.${fileExt}`;
    try {
      const { data, error } = await supabase.storage
        .from('public-assets') // Or your specific bucket for encyclopedia images
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);
      logger.log("Image uploaded to Supabase. Public URL:", publicUrl);
      return publicUrl;
    } catch (error) {
      logger.error('Error uploading image to Supabase:', error);
      toast({ title: "Image Upload Failed", description: (error as Error).message, variant: "destructive" });
      return null;
    }
  };

  const onSubmit: SubmitHandler<EncyclopediaEntryFormValues> = async (data) => {
    logger.log('Form submitted. Data:', data, 'Image file:', imageFileToUpload);
    let finalImageUrl = entry?.image_url || null; // Keep existing image if no new one

    if (imageFileToUpload) { // If a new image file is selected
      const uploadedUrl = await uploadImage(imageFileToUpload);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        // Upload failed, decide if form submission should proceed or halt
        toast({ title: "Save Error", description: "Image upload failed. Please try again.", variant: "destructive"});
        return; // Halt submission
      }
    } else if (currentImagePreview === null && entry?.image_url) {
      // Image was removed (preview is null), but there was an existing server URL
      // Here you might want to delete the old image from storage if `finalImageUrl` is set to null.
      // For now, if preview is null, it means user wants to remove the image.
      finalImageUrl = null; 
      // TODO: Add logic to delete entry.image_url from Supabase storage if it exists and finalImageUrl is null
    }


    const submissionData = { ...data, image_url: finalImageUrl };
    logger.log('Final data for submission:', submissionData);

    try {
      if (entry?.id) { // Editing existing entry
        await updateMutation.mutateAsync({ ...submissionData, id: entry.id });
        toast({ title: "Entry Updated", description: `"${data.title}" has been updated.` });
      } else { // Creating new entry
        await createMutation.mutateAsync(submissionData);
        toast({ title: "Entry Created", description: `"${data.title}" has been added to the encyclopedia.` });
      }
      onClose(); // Close modal on success
    } catch (error) {
      logger.error('Error saving encyclopedia entry:', error);
      // Mutations should handle their own error toasts. This is a fallback.
      if (!(error instanceof Error && error.message.includes("Unique constraint failed"))) {
         toast({ title: "Save Failed", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const handleDeleteEntry = async () => {
    if (!entry?.id) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast({ title: "Entry Deleted", description: `"${entry.title}" has been removed.` });
      onClose();
    } catch (error) {
      logger.error("Error deleting entry:", error);
      // Mutation hook should show toast.
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-white">{entry ? 'Edit Encyclopedia Entry' : 'Create New Encyclopedia Entry'}</DialogTitle>
          <DialogDescription>
            {entry ? `Modify the details for "${entry.title}".` : "Add a new term or concept to the encyclopedia."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Basic Info */}
          <div>
            <Label htmlFor="title" className="text-white">Title</Label>
            <Input id="title" {...register('title')} className="bg-input text-white border-input" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="subtext" className="text-white">Subtext / Short Description</Label>
            <Input id="subtext" {...register('subtext')} className="bg-input text-white border-input" />
            {errors.subtext && <p className="text-red-500 text-xs mt-1">{errors.subtext.message}</p>}
          </div>
          <div>
            <Label htmlFor="popup_text" className="text-white">Popup Text (Detailed Content)</Label>
            <Textarea id="popup_text" {...register('popup_text')} rows={5} className="bg-input text-white border-input" />
            {errors.popup_text && <p className="text-red-500 text-xs mt-1">{errors.popup_text.message}</p>}
          </div>

          {/* Image and Focal Point */}
          <div className="space-y-2">
            <Label className="text-white">Background Image</Label>
            <ImageUploader 
              onImageSelected={handleImageSelected} 
              currentImageUrl={currentImagePreview}
              showClearButton={!!currentImagePreview}
              identifier="encyclopedia-image"
            />
             {currentImagePreview && (
                <div className="mt-2">
                    <Label className="text-white">Focal Point</Label>
                    <FocalPointPicker
                        imageUrl={currentImagePreview}
                        focalPoint={{ x: watch('focal_point_x') || 50, y: watch('focal_point_y') || 50 }}
                        onFocalPointChange={(point) => {
                            setValue('focal_point_x', point.x);
                            setValue('focal_point_y', point.y);
                        }}
                        imageContainerClassName="w-full h-48 rounded-md"
                    />
                </div>
            )}
          </div>


          {/* Opacity Sliders */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="opacity" className="text-white">Background Opacity: {backgroundOpacity}%</Label>
              <Controller
                name="opacity"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="opacity"
                    min={0} max={100} step={1}
                    defaultValue={[field.value || 50]}
                    onValueChange={(value) => field.onChange(value[0])}
                    className="mt-2"
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="popup_opacity" className="text-white">Popup Opacity: {popupOpacity}%</Label>
               <Controller
                name="popup_opacity"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="popup_opacity"
                    min={0} max={100} step={1}
                    defaultValue={[field.value || field.value === 0 ? field.value : 50]} // Ensure 0 is a valid default if set
                    onValueChange={(value) => field.onChange(value[0])}
                    className="mt-2"
                  />
                )}
              />
            </div>
          </div>
          
          {/* Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white block mb-2">Title Color</Label>
              <Controller
                name="title_color"
                control={control}
                render={({ field }) => (
                  <ChromePicker 
                    color={field.value || '#FFFFFF'} 
                    onChangeComplete={(color: ColorResult) => field.onChange(color.hex)}
                    disableAlpha 
                    className="!shadow-none !bg-transparent" 
                  />
                )}
              />
            </div>
            <div>
              <Label className="text-white block mb-2">Subtext Color</Label>
              <Controller
                name="subtext_color"
                control={control}
                render={({ field }) => (
                  <ChromePicker 
                    color={field.value || '#8E9196'} 
                    onChangeComplete={(color: ColorResult) => field.onChange(color.hex)}
                    disableAlpha
                    className="!shadow-none !bg-transparent"
                  />
                )}
              />
            </div>
          </div>

          {/* Highlight Effect Switch */}
          <div className="flex items-center space-x-2">
            <Controller
                name="highlight_effect"
                control={control}
                render={({ field }) => (
                    <Switch
                        id="highlight_effect"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="highlight_effect" className="text-white">Enable Highlight Effect</Label>
          </div>
          
          <DialogFooter className="pt-6">
            {entry && (
              <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isLoading} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/80 text-primary-foreground">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {entry ? 'Save Changes' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {entry && (
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDeleteEntry}
          itemName={entry.title || "this entry"}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </Dialog>
  );
};

export default EditEncyclopediaModal;
