
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
      <Button 
        type="button" 
        variant="destructive" 
        onClick={onDelete} 
        className="mr-auto bg-red-700 text-white hover:bg-red-600"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Card
      </Button>
      
      <div className="flex space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose} 
          className="bg-transparent border border-slate-600 text-white hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </DialogFooter>
  );
};

export default ModalActions;
