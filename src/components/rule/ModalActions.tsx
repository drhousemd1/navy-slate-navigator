
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Save } from "lucide-react";

interface ModalActionsProps {
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}

const ModalActions: React.FC<ModalActionsProps> = ({ onCancel, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-between items-center mt-6">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-red-500 border-red-500 hover:bg-red-500/10"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
      <div className="space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ModalActions;
