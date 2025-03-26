
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import BackgroundImageSelector from '@/components/task-editor/BackgroundImageSelector';
import { useToast } from "@/hooks/use-toast";

interface EditEncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EncyclopediaEntry) => void;
  entry?: EncyclopediaEntry;
}

export interface EncyclopediaEntry {
  id: string;
  title: string;
  subtext: string;
  image_url?: string | null;
  focal_point_x: number;
  focal_point_y: number;
  opacity: number;
}

const EditEncyclopediaModal: React.FC<EditEncyclopediaModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  entry 
}) => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(entry?.image_url || null);
  
  const form = useForm<EncyclopediaEntry>({
    defaultValues: {
      id: entry?.id || '',
      title: entry?.title || '',
      subtext: entry?.subtext || '',
      focal_point_x: entry?.focal_point_x || 50,
      focal_point_y: entry?.focal_point_y || 50,
      opacity: entry?.opacity || 100,
    }
  });
  
  useEffect(() => {
    if (isOpen && entry) {
      form.reset({
        id: entry.id,
        title: entry.title,
        subtext: entry.subtext,
        focal_point_x: entry.focal_point_x || 50,
        focal_point_y: entry.focal_point_y || 50,
        opacity: entry.opacity || 100,
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
  
  return (
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
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="border-light-navy text-white hover:bg-light-navy">
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
  );
};

export default EditEncyclopediaModal;
