
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import EmptyState from '@/components/common/EmptyState'; 
import { ShieldOff, LoaderCircle } from 'lucide-react'; 
import ErrorDisplay from '@/components/common/ErrorDisplay';
import CachedDataBanner from '@/components/common/CachedDataBanner';

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
  refetch?: () => void;
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken,
  error,
  isUsingCachedData,
  refetch
}) => {

  if (isLoading && rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rules...</p>
      </div>
    );
  }

  if (error && rules.length === 0) {
    return (
      <ErrorDisplay
        title="Error Loading Rules"
        error={error}
        onRetry={refetch}
      />
    );
  }

  if (!isLoading && rules.length === 0 && !error) { 
    return (
      <EmptyState
        icon={ShieldOff}
        title="No Rules Yet"
        description="It looks like there are no rules defined. You can create rules using the dedicated button."
      />
    );
  }

  return (
    <>
      {isUsingCachedData && rules.length > 0 && <CachedDataBanner />}
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
