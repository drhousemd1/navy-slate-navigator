
import React from 'react';
import { Rule } from '@/lib/ruleUtils';
import { Button } from '../ui/button';
import { Pencil, Skull } from 'lucide-react';

const RuleCardContent = ({
  rule,
  onEdit,
  onBreak,
  isViolated
}: {
  rule: Rule;
  onEdit: () => void;
  onBreak: () => void;
  isViolated: boolean;
}) => {
  return (
    <div className="relative z-10 flex flex-col p-4 md:p-6 h-full transition-opacity duration-[2000ms]">
      <h3 className="text-xl font-bold text-white mb-2">{rule.title}</h3>
      <p className="text-light-navy text-sm mb-4">{rule.description}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-red-500 text-lg font-semibold">Rule</span>
        <div className="flex space-x-2">
          <Button variant="outline" className="text-white border-white" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            onClick={onBreak}
            className={`${isViolated ? 'bg-red-600' : 'bg-light-navy'} text-white`}
          >
            <Skull className="w-4 h-4 mr-1" />
            {isViolated ? 'Violated' : 'Break'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RuleCardContent;
