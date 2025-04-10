
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
      
      // Reset task completions
      const { error: taskError } = await supabase
        .from('task_completion_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (taskError) throw new Error(`Error resetting task completions: ${taskError.message}`);
      
      // Reset rule violations
      const { error: ruleError } = await supabase
        .from('rule_violations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (ruleError) throw new Error(`Error resetting rule violations: ${ruleError.message}`);
      
      // Reset reward usage
      const { error: rewardError } = await supabase
        .from('reward_usage')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (rewardError) throw new Error(`Error resetting reward usages: ${rewardError.message}`);
      
      // Reset punishment history
      const { error: punishmentError } = await supabase
        .from('punishment_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (punishmentError) throw new Error(`Error resetting punishments: ${punishmentError.message}`);
      
      // Reset task usage data
      const { data: tasks, error: fetchTasksError } = await supabase
        .from('tasks')
        .select('id');
      
      if (fetchTasksError) throw new Error(`Error fetching tasks: ${fetchTasksError.message}`);
      
      // Update each task to reset usage data and completed status
      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          const { error: updateTaskError } = await supabase
            .from('tasks')
            .update({
              usage_data: [],
              completed: false,
              last_completed_date: null
            })
            .eq('id', task.id);
            
          if (updateTaskError) {
            console.error(`Error updating task ${task.id}:`, updateTaskError);
          }
        }
      }
      
      // Reset reward usage tracking
      const { data: rewards, error: fetchRewardsError } = await supabase
        .from('rewards')
        .select('id');
        
      if (fetchRewardsError) throw new Error(`Error fetching rewards: ${fetchRewardsError.message}`);
      
      // Force a complete cache reset to ensure all components refresh
      queryClient.removeQueries();
      queryClient.invalidateQueries();
      
      // Then invalidate specific queries to ensure they reload
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['punishment-history'] });
      queryClient.invalidateQueries({ queryKey: ['rule-violations'] });
      
      toast({
        title: 'Reset Complete',
        description: 'All activity data has been reset successfully. Please refresh any open pages to see the changes.',
        duration: 5000,
      });
      
      // Force window reload to ensure metrics pages are refreshed
      window.location.reload();
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
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
