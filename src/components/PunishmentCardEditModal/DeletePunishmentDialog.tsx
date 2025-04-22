import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

interface DeletePunishmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
}

const DeletePunishmentDialog: React.FC<DeletePunishmentDialogProps> = ({
  isOpen,
  onOpenChange,
  onDelete,
}) => {
  const handleDelete = () => {
    if (onDelete) {
      onDelete('TODO: Replace with actual punishment ID'); // TODO: Replace with actual punishment ID
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="bg-red-700 border-light-navy text-white hover:bg-red-600">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-navy border-light-navy text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Are you sure?</DialogTitle>
          <DialogDescription className="text-sm text-light-navy">
            This action cannot be undone. This will permanently delete the punishment from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={handleDelete} className="bg-red-700 border-light-navy text-white hover:bg-red-600">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DeletePunishmentDialog };