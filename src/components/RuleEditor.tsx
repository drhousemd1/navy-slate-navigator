import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import RuleEditorForm from './rule-editor/RuleEditorForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { Rule } from '@/data/interfaces/Rule';

interface RuleEditorProps {
  isOpen: boolean;
  preserveHistory?: boolean;
  onClose: () => void;
  ruleData?: Rule | Partial<Rule>;
  onSave: (ruleData: Partial<Rule>) => Promise<void>;
  onDelete?: (ruleId: string) => Promise<void>;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ 
  isOpen, preserveHistory = false,
  onClose, 
  ruleData, 
  onSave, 
  onDelete 
}) => {
  const text = useCoreTextClasses();
  const isMobile = useIsMobile();
  
  const handleSave = async (formData: Partial<Rule>) => {
    await onSave(formData);
  };

  const handleDelete = async (ruleId: string) => {
    if (onDelete) {
      await onDelete(ruleId);
    }
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[100vh] bg-navy border-light-navy pt-10 px-0 overflow-y-auto">
          <div className="px-4">
            <SheetHeader className="text-center mb-6">
              <SheetTitle className={`text-2xl font-bold ${text.primary}`}>
                {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
              </SheetTitle>
              <SheetDescription className={text.subtle}>
                {ruleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
              </SheetDescription>
            </SheetHeader>
            
            <RuleEditorForm
              preserveHistory={preserveHistory}
              ruleData={ruleData as Rule}
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
      <DialogContent className={`max-w-[90vw] max-h-[90vh] bg-navy border-light-navy ${text.primary} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={`text-2xl font-bold ${text.primary}`}>
            {ruleData?.id ? 'Edit Rule' : 'Create New Rule'}
          </DialogTitle>
          <DialogDescription className={text.subtle}>
            {ruleData?.id ? 'Modify the existing rule' : 'Create a new rule to track'}
          </DialogDescription>
        </DialogHeader>
        
        <RuleEditorForm
          preserveHistory={preserveHistory}
          ruleData={ruleData as Rule}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RuleEditor;
