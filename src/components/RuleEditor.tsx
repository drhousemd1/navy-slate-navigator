
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import RuleEditorForm from './rule-editor/RuleEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data?: number[];
}

interface RuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  ruleData?: Partial<Rule>;
  onSave: (ruleData: any) => void;
  onDelete?: (ruleId: string) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ 
  isOpen, 
  onClose, 
  ruleData, 
  onSave, 
  onDelete 
}) => {
  const isMobile = useIsMobile();
  
  const handleSave = async (formData: any) => {
    await onSave(formData);
    onClose();
  };

  const handleDelete = (ruleId: string) => {
    if (onDelete) {
      onDelete(ruleId);
      onClose();
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[100vh] bg-navy border-light-navy pt-10 px-0 overflow-y-auto">
          <div className="px-4">
            <SheetHeader className="text-center mb-6">
              <SheetTitle className="text-2xl font-bold text-white">
                {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
              </SheetTitle>
              <SheetDescription className="text-light-navy">
                {ruleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
              </SheetDescription>
            </SheetHeader>
            
            <RuleEditorForm
              ruleData={ruleData}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancel={onClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] bg-navy border-light-navy text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
          </DialogTitle>
          <DialogDescription className="text-light-navy">
            {ruleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
          </DialogDescription>
        </DialogHeader>
        
        <RuleEditorForm
          ruleData={ruleData}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
