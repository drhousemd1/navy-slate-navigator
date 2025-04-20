
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { getSupabaseClient } from '@/integrations/supabase/client';
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

      // Define fixed tables with proper typing
      const tables = [
        { name: 'task_completion_history', column: 'id' },
        { name: 'rule_violations', column: 'id' },
        { name: 'reward_usage', column: 'id' },
        { name: 'punishment_history', column: 'id' }
      ];

      const supabase = getSupabaseClient();

      for (const { name, column } of tables) {
        // Type assertion to ensure name is treated as a valid table name
        const { error, count } = await supabase
          .from(name)
          .delete()
          .neq(column, '00000000-0000-0000-0000-000000000000')
          .select('count');

        if (error) {
          throw new Error(`Failed to delete from ${name}: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from ${name}`);
      }

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

      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Reset Complete",
        description: "All tracked data has been deleted.",
      });

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
            className="bg-red-700 hover:bg-red-800"
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

