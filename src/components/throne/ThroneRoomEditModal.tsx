
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

export interface ThroneRoomCardData {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

interface ThroneRoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ThroneRoomCardData;
  onSave: (updatedData: ThroneRoomCardData) => void;
}

const ThroneRoomEditModal: React.FC<ThroneRoomEditModalProps> = ({
  isOpen,
  onClose,
  cardData,
  onSave
}) => {
  const [title, setTitle] = React.useState(cardData.title);
  const [description, setDescription] = React.useState(cardData.description);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(cardData.title);
      setDescription(cardData.description);
    }
  }, [isOpen, cardData]);

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty",
        variant: "destructive"
      });
      return;
    }

    onSave({
      ...cardData,
      title,
      description
    });
    
    toast({
      title: "Success",
      description: "Card updated successfully",
    });
    
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border border-light-navy text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Throne Room Card</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-light-navy border-light-navy text-white"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-light-navy border-light-navy text-white min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="border-light-navy">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThroneRoomEditModal;
