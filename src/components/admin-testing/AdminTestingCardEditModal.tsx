
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { AdminTestingCardData } from './AdminTestingCard';
import ColorPickerField from '@/components/task-editor/ColorPickerField';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardData: AdminTestingCardData;
  onSave: (data: AdminTestingCardData) => void;
}

const AdminTestingCardEditModal: React.FC<Props> = ({ isOpen, onClose, cardData, onSave }) => {
  const [imageSlots, setImageSlots] = useState<(string | null)[]>(cardData.background_images || [null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const form = useForm<AdminTestingCardData>({
    defaultValues: { ...cardData, carousel_interval: cardData.carousel_interval || 5000 }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ ...cardData, carousel_interval: cardData.carousel_interval || 5000 });
      setImageSlots(cardData.background_images || [null, null, null, null, null]);
      setSelectedSlot(null);
    }
  }, [isOpen, cardData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSlot !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = [...imageSlots];
        updated[selectedSlot] = reader.result as string;
        setImageSlots(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    if (selectedSlot !== null) {
      const updated = [...imageSlots];
      updated[selectedSlot] = null;
      setImageSlots(updated);
    }
  };

  const handleSave = () => {
    const updatedData: AdminTestingCardData = {
      ...form.getValues(),
      background_images: imageSlots,
    };
    localStorage.setItem('adminTestingCards', JSON.stringify(updatedData));
    onSave(updatedData);
    onClose();
    toast({ title: 'Saved', description: 'Card updated' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit AdminTesting Card</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
              </FormItem>
            )} />

            <div>
              <FormLabel>Image Slots</FormLabel>
              <div className="flex gap-2 mt-1">
                {imageSlots.map((img, i) => (
                  <div
                    key={i}
                    className={`w-16 h-16 border ${selectedSlot === i ? 'border-yellow-400 shadow-md' : 'border-slate-700'} bg-black/30 flex items-center justify-center cursor-pointer`}
                    onClick={() => setSelectedSlot(i)}
                  >
                    {img ? <img src={img} className="object-cover w-full h-full" /> : '+'}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input type="file" onChange={handleImageUpload} />
                <Button type="button" variant="outline" onClick={handleRemoveImage}>Remove</Button>
              </div>
            </div>

            <FormField control={form.control} name="carousel_interval" render={({ field }) => (
              <FormItem>
                <FormLabel>Carousel Timer (ms)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <ColorPickerField control={form.control} name="title_color" label="Title Color" />
              <ColorPickerField control={form.control} name="subtext_color" label="Description Color" />
              <ColorPickerField control={form.control} name="calendar_color" label="Calendar Color" />
              <ColorPickerField control={form.control} name="icon_color" label="Icon Color" />
            </div>

            <FormField control={form.control} name="highlight_effect" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between mt-2">
                <FormLabel>Highlight Effect</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-4">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTestingCardEditModal;
