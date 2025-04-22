import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

interface DeleteRewardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: number) => void;
}

const DeleteRewardDialog: React.FC<DeleteRewardDialogProps> = ({
  isOpen,
  onOpenChange,
  onDelete,
}) => {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(123); // TODO: Replace with actual reward ID
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
            This action cannot be undone. This will permanently delete the reward from our servers.
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

export { DeleteRewardDialog };