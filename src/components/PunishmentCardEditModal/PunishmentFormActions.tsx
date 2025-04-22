import React from 'react';
import { Button } from "@/components/ui/button";

interface PunishmentFormActionsProps {
  punishmentData?: any;
  loading: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  onCancel: () => void;
  onDelete?: (index: string) => void;
}

const PunishmentFormActions: React.FC<PunishmentFormActionsProps> = ({
  punishmentData,
  loading,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onCancel,
  onDelete,
}) => {
  return (
    <div className="pt-4 w-full flex items-center justify-end gap-3">
      {/* {punishmentData?.id && onDelete && (
        <DeletePunishmentDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onDelete={onDelete}
        />
      )} */}
      <Button type="button" variant="destructive" onClick={onCancel} className="bg-red-700 border-light-navy text-white hover:bg-red-600">
        Cancel
      </Button>
      <Button type="submit" className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2" disabled={loading}>
        {loading ? 'Saving...' : (
          <>
            {/* <Save className="h-4 w-4" /> */}
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default PunishmentFormActions;