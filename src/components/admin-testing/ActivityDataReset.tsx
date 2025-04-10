
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

      // Define tables with their exact literal types to satisfy TypeScript
      const deleteFromTable = async (
        table: 'task_completion_history' | 'rule_violations' | 'reward_usage' | 'punishment_history'
      ) => {
        // Correct Supabase API call with proper TypeScript syntax
        const { error, count } = await supabase
          .from(table)
          .delete()
          .gt('created_at', '1900-01-01')
          .select('*', { head: false, count: 'exact' } as any)

        if (error) {
          throw new Error(`Failed to delete from ${table}: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from ${table}`);
        return count;
      };

      // Delete from all activity tables
      await deleteFromTable('task_completion_history');
      await deleteFromTable('rule_violations');
      await deleteFromTable('reward_usage');
      await deleteFromTable('punishment_history');

      // Reset tasks
      const { data: tasks, error: fetchTasksError } = await supabase
        .from('tasks')
        .select('id');

      if (fetchTasksError) {
        throw new Error("Failed to fetch tasks");
      }

      for (const task of tasks) {
        const { error: updateTaskError } = await supabase
          .from('tasks')
          .update({
            usage_data: [0, 0, 0, 0, 0, 0, 0],
            completed: false,
            last_completed_date: null,
            frequency_count: 0
          })
          .eq('id', task.id);

        if (updateTaskError) {
          throw new Error(`Failed to update task ${task.id}: ${updateTaskError.message}`);
        }
      }

      // Reset rules
      const { data: rules, error: fetchRulesError } = await supabase
        .from('rules')
        .select('id');

      if (fetchRulesError) {
        throw new Error("Failed to fetch rules");
      }

      for (const rule of rules) {
        const { error: updateRuleError } = await supabase
          .from('rules')
          .update({
            usage_data: [0, 0, 0, 0, 0, 0, 0],
            frequency_count: 0,
            last_violation_date: null
          })
          .eq('id', rule.id);

        if (updateRuleError) {
          throw new Error(`Failed to update rule ${rule.id}: ${updateRuleError.message}`);
        }
      }

      // Reset rewards supply and ensure any cached data is cleared
      const { data: rewards, error: fetchRewardsError } = await supabase
        .from('rewards')
        .select('id');

      if (fetchRewardsError) {
        throw new Error("Failed to fetch rewards");
      }

      // Update rewards to reset their state
      for (const reward of rewards) {
        const { error: updateRewardError } = await supabase
          .from('rewards')
          .update({
            // Reset important reward state data
            supply: 0 // Reset supply to 0
          })
          .eq('id', reward.id);

        if (updateRewardError) {
          throw new Error(`Failed to update reward ${reward.id}: ${updateRewardError.message}`);
        }
      }

      // Force clear all caches to ensure no stale data is displayed
      queryClient.clear();
      queryClient.invalidateQueries();
      
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Reset Complete",
        description: "All tracked data has been deleted.",
      });

      // Redirect with a timestamp parameter to force fresh page load
      window.location.href = `/admin-testing?fresh=${Date.now()}`;
    } catch (err: any) {
      console.error("Reset failed:", err.message);
      toast({
        title: "Reset Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mt-12 p-6 bg-red-900/20 border border-red-900 rounded-lg">
      <div className="flex items-start gap-4">
        <AlertTriangle className="text-red-500 h-6 w-6 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-500 mb-2">
            Reset Activity Data
          </h3>
          <p className="text-gray-300 mb-4">
            This will permanently delete ALL activity data including task completions, 
            rule violations, reward usages, punishments, and reset all usage trackers. 
            This action cannot be undone.
          </p>
          <Button 
            variant="destructive" 
            size="lg"
            className="bg-red-700 hover:bg-red-800 text-white"
            onClick={handleReset}
            disabled={isResetting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {isResetting ? 'Resetting...' : 'Reset All Activity Data'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActivityDataReset;
