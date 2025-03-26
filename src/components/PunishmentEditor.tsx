
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PunishmentEditorForm from './punishments/PunishmentEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tables } from '@/integrations/supabase/types';
import { PunishmentData } from '@/contexts/punishments/types';

// Define the PunishmentData type based on the Supabase tables
// export type PunishmentData = {
//   id?: string;
//   title: string;
//   description?: string;
//   points: number;
//   icon_name?: string;
//   icon_color?: string;
//   title_color?: string;
//   subtext_color?: string;
//   calendar_color?: string;
//   highlight_effect?: boolean;
//   background_image_url?: string;
//   background_opacity?: number;
//   focal_point_x?: number;
//   focal_point_y?: number;
// };

interface PunishmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  punishmentData?: PunishmentData;
  onSave: (data: PunishmentData) => Promise<void>;
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

  const handleSave = async (data: PunishmentData) => {
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
          onSave={handleSave}
          onCancel={onClose}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PunishmentEditor;
