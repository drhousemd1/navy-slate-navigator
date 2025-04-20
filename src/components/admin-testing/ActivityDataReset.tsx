
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const ActivityDataReset = () => {
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset ALL activity data? This cannot be undone.')) {
      return;
    }

    try {
      setIsResetting(true);
      console.log("Resetting all activity data...");

      // Fixed approach: Using type-safe table names and correct count API
      const deleteTaskCompletions = async () => {
        const { error, count } = await supabase
          .from('task_completion_history')
          .delete()
          .gt('completed_at', '1900-01-01')
          .select('count');

        if (error) {
          throw new Error(`Failed to delete from task_completion_history: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from task_completion_history`);
        return count;
      };

      const deleteRuleViolations = async () => {
        const { error, count } = await supabase
          .from('rule_violations')
          .delete()
          .gt('violation_date', '1900-01-01')
          .select('count');

        if (error) {
          throw new Error(`Failed to delete from rule_violations: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from rule_violations`);
        return count;
      };

      const deleteRewardUsage = async () => {
        const { error, count } = await supabase
          .from('reward_usage')
          .delete()
          .gt('created_at', '1900-01-01')
          .select('count');

        if (error) {
          throw new Error(`Failed to delete from reward_usage: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from reward_usage`);
        return count;
      };

      const deletePunishmentHistory = async () => {
        const { error, count } = await supabase
          .from('punishment_history')
          .delete()
          .gt('applied_date', '1900-01-01')
          .select('count');

        if (error) {
          throw new Error(`Failed to delete from punishment_history: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from punishment_history`);
        return count;
      };

      // Delete data from each activity table with type-safe calls
      await deleteTaskCompletions();
      await deleteRuleViolations();
      await deleteRewardUsage();
      await deletePunishmentHistory();

      // Invalidate relevant queries so charts and tiles update
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });

      toast({
        title: 'Activity data reset successfully.',
        description: 'All relevant entries have been deleted and UI will refresh.',
      });
    } catch (err: any) {
      toast({
        title: 'Reset failed.',
        description: err.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mt-4">
      <Button
        variant="destructive"
        onClick={handleReset}
        disabled={isResetting}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        {isResetting ? 'Resetting...' : 'Reset All Activity Data'}
      </Button>
      <p className="text-sm text-muted-foreground mt-2 flex items-start">
        <AlertTriangle className="h-4 w-4 mr-2 mt-1" />
        This will delete all activity history, including task completions, rule violations, reward use, and punishments. This action cannot be undone.
      </p>
    </div>
  );
};

export default ActivityDataReset;
