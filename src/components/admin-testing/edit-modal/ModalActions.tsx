
import React from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';

interface ModalActionsProps {
  onClose: () => void;
  onDelete: () => void;
  isSaving: boolean;
}

const ModalActions: React.FC<ModalActionsProps> = ({ onClose, onDelete, isSaving }) => {
  return (
    <DialogFooter className="flex justify-between items-center pt-4">
      <div className="flex space-x-2">
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onDelete} 
          className="bg-red-600 text-white hover:bg-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onClose} 
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Cancel
        </Button>
        
        <Button 
          type="submit"
          className="bg-blue-600 text-white hover:bg-blue-700"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Loader2 className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </DialogFooter>
  );
};

export default ModalActions;
