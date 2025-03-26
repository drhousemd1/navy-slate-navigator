
import React from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PunishmentEditorForm from './punishments/PunishmentEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface PunishmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  punishmentData?: any;
  onSave: (data: any) => Promise<void>;
  onDelete?: (index: any) => void;
}

const PunishmentEditor: React.FC<PunishmentEditorProps> = ({
  isOpen,
  onClose,
  punishmentData,
  onSave,
  onDelete
}) => {
  const isMobile = useIsMobile();

  const handleSave = async (data: any) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error("Error saving punishment:", error);
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="bg-navy border-light-navy pt-10 px-0 overflow-y-auto">
          <div className="px-4">
            <PunishmentEditorForm
              punishmentData={punishmentData}
              onSave={handleSave}
              onCancel={onClose}
              onDelete={onDelete}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-2xl">
        <PunishmentEditorForm
          punishmentData={punishmentData}
          onSave={handleSave}
          onCancel={onClose}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PunishmentEditor;
