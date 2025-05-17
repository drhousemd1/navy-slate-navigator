
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
}

const RuleCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-3/4" /> {/* Title */}
      <Skeleton className="h-5 w-20" /> {/* Points/Violation count */}
    </div>
    <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
    <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-20" /> {/* Edit Button */}
      <Skeleton className="h-8 w-24" /> {/* Mark Broken Button */}
    </div>
  </div>
);

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken 
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

  if (!isLoading && rules.length === 0) { // Added !isLoading for clarity
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
