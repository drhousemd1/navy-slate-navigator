
import React from 'react';
import RuleCard from './RuleCard';
import { Rule } from '@/data/interfaces/Rule';
import EmptyState from '@/components/common/EmptyState'; 
import { ShieldOff, LoaderCircle, AlertTriangle, WifiOff } from 'lucide-react'; 
import { toast } from "@/hooks/use-toast";

interface RulesListProps {
  rules: Rule[];
  isLoading: boolean;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  isLoading,
  onEditRule,
  onRuleBroken,
  error,
  isUsingCachedData
}) => {
  React.useEffect(() => {
    if (isUsingCachedData && !isLoading) { // Show toast only when not actively loading
      toast({
        title: "Using cached data",
        description: "We're currently showing you cached rules data due to connection issues.",
        variant: "default"
      });
    }
  }, [isUsingCachedData, isLoading]);

  if (isLoading && (!rules || rules.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rules...</p>
      </div>
    );
  }

  if (error && (!rules || rules.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold mb-2">Error loading rules</p>
        <p className="text-slate-400">{error.message}</p>
        <p className="text-slate-400 mt-4">We'll automatically retry loading your data. If the problem persists, check your connection.</p>
      </div>
    );
  }

  if (!isLoading && rules.length === 0) { // Condition implies error is null or handled
    return (
      <EmptyState
        icon={ShieldOff}
        title="No Rules Yet"
        description="It looks like there are no rules defined. You can create rules using the dedicated button."
      />
    );
  }

  const CachedDataBanner = isUsingCachedData && rules.length > 0 ? (
    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-center gap-2">
      <WifiOff className="h-5 w-5 text-amber-500" />
      <span className="text-sm text-amber-700 dark:text-amber-400">Showing cached data. Some information might be outdated.</span>
    </div>
  ) : null;

  return (
    <>
      {CachedDataBanner}
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
    </>
  );
};

export default RulesList;
