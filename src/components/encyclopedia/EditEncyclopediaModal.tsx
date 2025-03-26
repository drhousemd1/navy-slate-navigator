
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ColorPickerField from '@/components/task-editor/ColorPickerField';
import { Switch } from "@/components/ui/switch";

interface EditEncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EncyclopediaEntry) => void;
  onDelete?: (id: string) => void;
  entry?: EncyclopediaEntry;
}

export interface EncyclopediaEntry {
  id: string;
  title: string;
  subtext: string;
  popup_text?: string;
  image_url?: string | null;
  focal_point_x: number;
  focal_point_y: number;
  opacity: number;
  title_color: string;
  subtext_color: string;
  highlight_effect?: boolean; // Add this new property
}

const EditEncyclopediaModal: React.FC<EditEncyclopediaModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete, 
  entry 
}) => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(entry?.image_url || null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<EncyclopediaEntry>({
    defaultValues: {
      id: entry?.id || '',
      title: entry?.title || '',
      subtext: entry?.subtext || '',
      popup_text: entry?.popup_text || '',
      focal_point_x: entry?.focal_point_x || 50,
      focal_point_y: entry?.focal_point_y || 50,
      opacity: entry?.opacity || 100,
      title_color: entry?.title_color || '#FFFFFF',
      subtext_color: entry?.subtext_color || '#D1D5DB',
      highlight_effect: entry?.highlight_effect || false, // Set default to false
    }
  });
  
  useEffect(() => {
    if (isOpen && entry) {
      form.reset({
        id: entry.id,
        title: entry.title,
        subtext: entry.subtext,
        popup_text: entry.popup_text || '',
        focal_point_x: entry.focal_point_x || 50,
        focal_point_y: entry.focal_point_y || 50,
        opacity: entry.opacity || 100,
        title_color: entry.title_color || '#FFFFFF',
        subtext_color: entry.subtext_color || '#D1D5DB',
        highlight_effect: entry.highlight_effect || false, // Include in reset
      });
      setImagePreview(entry.image_url || null);
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
    toast({
      title: "Success",
      description: "Encyclopedia entry updated successfully.",
    });
    onClose();
  };

  const handleDelete = () => {
    if (entry && onDelete) {
      onDelete(entry.id);
      toast({
        title: "Deleted",
        description: "Encyclopedia entry has been deleted.",
      });
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-navy border border-light-navy text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Encyclopedia Entry</DialogTitle>
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
              
              <FormField
                control={form.control}
                name="popup_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Pop-up Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter text to show in full-screen pop-up" 
                        className="bg-dark-navy border-light-navy text-white"
                        rows={6}
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
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
              
              {/* Add highlight effect toggle */}
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
              
              <div className="space-y-2">
                <FormLabel className="text-white">Background Image</FormLabel>
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
              
              <DialogFooter className="pt-4 space-x-2">
                {onDelete && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="mr-auto bg-red-700 hover:bg-red-800"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-nav-active text-white hover:bg-nav-active/80">
                  Save Changes
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
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditEncyclopediaModal;
