import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PunishmentEditorForm from './punishments/PunishmentEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { PunishmentData } from '@/contexts/punishments/types';
import { logger } from '@/lib/logger';

interface PunishmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  punishmentData?: PunishmentData;
  onSave: (data: Partial<PunishmentData>) => Promise<PunishmentData>; // Updated return type to always return PunishmentData
  onDelete?: (id: string) => void;
}

const PunishmentEditor: React.FC<PunishmentEditorProps> = ({
  isOpen,
  onClose,
  punishmentData,
  onSave,
  onDelete
}) => {
  const isMobile = useIsMobile();

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Log state changes for debugging
  useEffect(() => {
    logger.log("PunishmentEditor isOpen changed:", isOpen);
  }, [isOpen]);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent className="bg-navy border-light-navy pt-10 px-0 overflow-y-auto" side="bottom" style={{ height: "100vh" }}>
          <div className="px-4">
            <SheetHeader className="text-center mb-6">
              <SheetTitle className="text-2xl font-bold text-white">
                {punishmentData?.id ? 'Edit Punishment' : 'Create New Punishment'}
              </SheetTitle>
              <SheetDescription className="text-light-navy">
                {punishmentData?.id ? 'Modify the existing punishment' : 'Create a new punishment to apply'}
              </SheetDescription>
            </SheetHeader>
            <PunishmentEditorForm
              punishmentData={punishmentData}
              onSave={onSave}
              onCancel={handleClose}
              onDelete={onDelete}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {punishmentData?.id ? 'Edit Punishment' : 'Create New Punishment'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {punishmentData?.id ? 'Modify the existing punishment' : 'Create a new punishment to apply'}
          </DialogDescription>
        </DialogHeader>
        <PunishmentEditorForm
          punishmentData={punishmentData}
          onSave={onSave}
          onCancel={handleClose}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PunishmentEditor;
