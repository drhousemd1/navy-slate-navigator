
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

import BasicDetailsSection from "./BasicDetailsSection";
import ImageSelectionSection from "./ImageSelectionSection";
import IconSelectionSection from "./IconSelectionSection";
import ColorSettingsSection from "./ColorSettingsSection";
import HighlightEffectToggle from "./HighlightEffectToggle";
import ModalActions from "./ModalActions";

import { useModalImageHandling } from "./useModalImageHandling";

export interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_images?: string[];
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data: number[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface RuleEditorProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  rule: Rule;
  handleChange: (field: keyof Rule, value: any) => void;
  onSave: () => Promise<void>;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  open,
  setOpen,
  rule,
  handleChange,
  onSave
}) => {
  const form = useForm<Rule>({ defaultValues: rule });

  const {
    imagePreview,
    imageSlots,
    selectedBoxIndex,
    setSelectedBoxIndex,
    handleImageUpload,
    handleRemoveImage,
  } = useModalImageHandling(rule.background_image_url || "", rule.background_images || []);

  React.useEffect(() => {
    form.reset(rule);
  }, [rule, form]);

  const handleSubmit = async () => {
    await onSave();
    toast({ title: "Rule saved" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Rule</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BasicDetailsSection card={rule} handleChange={handleChange} />
            <ImageSelectionSection
              imagePreview={imagePreview}
              imageSlots={imageSlots}
              selectedBoxIndex={selectedBoxIndex}
              onSelectImageSlot={setSelectedBoxIndex}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              carouselTimer={5}
              onCarouselTimerChange={() => {}}
            />
            <IconSelectionSection card={rule} handleChange={handleChange} />
            <ColorSettingsSection card={rule} handleChange={handleChange} />
            <HighlightEffectToggle card={rule} handleChange={handleChange} />
          </div>
          <ModalActions onCancel={() => setOpen(false)} onSubmit={handleSubmit} />
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
