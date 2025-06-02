
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import { StandardLoading, StandardError, StandardEmpty } from '@/components/common/StandardizedStates';

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
  error?: Error | null;
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken,
  error,
}) => {

  if (isLoading && rules.length === 0) {
    return <StandardLoading />;
  }

  if (error && rules.length === 0) {
    return <StandardError />;
  }

  if (!isLoading && rules.length === 0 && !error) { 
    return <StandardEmpty />;
  }

  return (
    <div className="space-y-4 mt-4">
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
