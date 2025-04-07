
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AdminTestingCardData } from "./defaultAdminTestingCards";

interface AdminTestingEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AdminTestingCardData;
  onSave: (updatedCard: AdminTestingCardData) => void;
}

export function AdminTestingEditModal({ open, onOpenChange, card, onSave }: AdminTestingEditModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);

  function handleSave() {
    onSave({ ...card, title, description });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Admin Card</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Card description"
          />
        </div>
        <Button onClick={handleSave}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
