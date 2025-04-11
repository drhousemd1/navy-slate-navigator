import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImageSelectionSection from "@/components/admin-testing/edit-modal/ImageSelectionSection";
import ColorSettingsSection from "@/components/admin-testing/edit-modal/ColorSettingsSection";
import HighlightEffectToggle from "@/components/admin-testing/edit-modal/HighlightEffectToggle";
import IconSelectionSection from "@/components/admin-testing/edit-modal/IconSelectionSection";
import BasicDetailsSection from "@/components/admin-testing/edit-modal/BasicDetailsSection";
import ModalActions from "@/components/admin-testing/edit-modal/ModalActions";
import { usePunishmentEditor } from "@/components/punishments/hooks/usePunishmentEditor";

const PunishmentEditor = () => {
  const editor = usePunishmentEditor();

  // ✅ Fix: gracefully exit if editor is undefined
  if (!editor || !editor.isOpen) return null;

  return (
    <Dialog open={editor.isOpen} onOpenChange={editor.onClose}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-10rem)] p-6 space-y-6">
          <BasicDetailsSection {...editor} />
          <ColorSettingsSection {...editor} />
          <HighlightEffectToggle {...editor} />
          <IconSelectionSection {...editor} />
          <ImageSelectionSection {...editor} />
        </ScrollArea>
        <ModalActions {...editor} />
      </DialogContent>
    </Dialog>
  );
};

export default PunishmentEditor;
