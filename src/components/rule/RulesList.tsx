
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import RuleCardSkeleton from './RuleCardSkeleton';
import EmptyState from '@/components/common/EmptyState'; // Import the new EmptyState component
import { ShieldOff } from 'lucide-react'; // Example icon for no rules

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
  // Add a prop to allow customizing the action, e.g., a "Create Rule" button
  onCreateRuleClick?: () => void; 
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken,
  onCreateRuleClick
}) => {
  if (isLoading && rules.length === 0) {
    return (
      <div className="space-y-4">
        <RuleCardSkeleton />
        <RuleCardSkeleton />
        <RuleCardSkeleton />
      </div>
    );
  }

  if (!isLoading && rules.length === 0) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="No Rules Yet"
        description="It looks like there are no rules defined. Get started by creating your first one!"
        action={onCreateRuleClick && (
          <button 
            onClick={onCreateRuleClick} 
            className="mt-4 px-4 py-2 bg-primary-purple text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            Create First Rule
          </button>
        )}
      />
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
