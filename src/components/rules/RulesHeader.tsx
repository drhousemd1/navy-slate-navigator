
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface RulesHeaderProps {
  onAddRule: () => void;
}

const RulesHeader: React.FC<RulesHeaderProps> = ({ onAddRule }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
      <div>
        <h1 className="text-xl font-bold text-white">Rules</h1>
        <p className="text-nav-inactive text-sm">
          Manage your household rules and track violations
        </p>
      </div>
      
      <Button 
        onClick={onAddRule}
        className="mt-4 sm:mt-0 bg-cyan-600 hover:bg-cyan-700"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Rule
      </Button>
    </div>
  );
};

export default RulesHeader;
