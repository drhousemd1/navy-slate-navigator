
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import EmptyState from '@/components/common/EmptyState'; // Import the EmptyState component
import { ShieldOff, LoaderCircle } from 'lucide-react'; // Import LoaderCircle for consistent loading

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
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rules...</p>
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
