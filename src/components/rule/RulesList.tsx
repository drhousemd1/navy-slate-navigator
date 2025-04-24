
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import { Skeleton } from '../ui/skeleton';

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
  const existingRules = rules.length > 0;

  if (isLoading && !existingRules) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[200px] w-full bg-gray-800/50" />
        ))}
      </div>
    );
  }

  if (!isLoading && !existingRules) {
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
