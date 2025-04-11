import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImageSelectionSection from "@/components/admin-testing/edit-modal/ImageSelectionSection";
import ColorSettingsSection from "@/components/admin-testing/edit-modal/ColorSettingsSection";
import HighlightEffectToggle from "@/components/admin-testing/edit-modal/HighlightEffectToggle";
import IconSelectionSection from "@/components/admin-testing/edit-modal/IconSelectionSection";
import BasicDetailsSection from "@/components/admin-testing/edit-modal/BasicDetailsSection";
import ModalActions from "@/components/admin-testing/edit-modal/ModalActions";
import { PunishmentData } from "@/contexts/PunishmentsContext";

interface PunishmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  punishmentData: PunishmentData;
  onSave: (data: PunishmentData) => void;
  onDelete: () => void;
}

const PunishmentEditor: React.FC<PunishmentEditorProps> = ({
  isOpen,
  onClose,
  punishmentData,
  onSave,
  onDelete
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-10rem)] p-6 space-y-6">
          <BasicDetailsSection punishment={punishmentData} onChange={onSave} />
          <ColorSettingsSection punishment={punishmentData} onChange={onSave} />
          <HighlightEffectToggle punishment={punishmentData} onChange={onSave} />
          <IconSelectionSection punishment={punishmentData} onChange={onSave} />
          <ImageSelectionSection punishment={punishmentData} onChange={onSave} />
        </ScrollArea>
        <ModalActions onDelete={onDelete} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default PunishmentEditor;
