
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import EmptyState from '@/components/common/EmptyState'; 
import { ShieldOff, LoaderCircle } from 'lucide-react'; 
import ErrorDisplay from '@/components/common/ErrorDisplay';
// CachedDataBanner import removed

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
  error?: Error | null;
  // isUsingCachedData prop removed
  // refetch prop removed as ErrorDisplay will not have a retry button from here
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken,
  error,
  // isUsingCachedData, // removed
  // refetch // removed
}) => {

  // Show loading indicator only if actually loading AND no rules are available yet
  if (isLoading && rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rules...</p>
      </div>
    );
  }

  // Show error display only if there's an error AND no rules are available to show
  if (error && rules.length === 0) {
    return (
      <ErrorDisplay
        title="Error Loading Rules"
        message={error.message || "Could not fetch rules. Please check your connection or try again later."}
        // onRetry is not passed, so no button will be shown
      />
    );
  }

  // Show empty state if not loading, no error, and no rules
  if (!isLoading && rules.length === 0 && !error) { 
    return (
      <EmptyState
        icon={ShieldOff}
        title="No Rules Yet"
        description="You do not have any rules yet, create one to get started."
      />
    );
  }

  // If rules are available, display them, even if there was a background sync error
  // CachedDataBanner is removed
  return (
    <>
      {/* CachedDataBanner removed */}
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
    </>
  );
};

export default RulesList;
