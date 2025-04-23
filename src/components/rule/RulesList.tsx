
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken 
}) => {
  if (isLoading && rules.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white mb-4">Loading rules...</p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white mb-4">No rules found. Create your first rule!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          onEditRule={onEditRule}
          onRuleBroken={onRuleBroken}
        />
      ))}
    </div>
  );
};

export default RulesList;
