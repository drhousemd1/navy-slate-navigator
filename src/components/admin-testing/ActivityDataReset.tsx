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

      const deleteFromTable = async (table: string, dateField: string) => {
        const { error, count } = await supabase
          .from(table)
          .delete()
          .gt(dateField, '1900-01-01')
          .select('*', { count: 'exact' });

        if (error) {
          throw new Error(`Failed to delete from ${table}: ${error.message}`);
        }

        console.log(`Deleted ${count} rows from ${table}`);
        return count;
      };

      // Deleting data from each activity table with correct date fields
      await deleteFromTable('task_completion_history', 'completed_at');
      await deleteFromTable('rule_violations', 'violation_date');
      await deleteFromTable('reward_usage', 'created_at');
      await deleteFromTable('punishment_history', 'applied_date');

      // Invalidate relevant queries so charts and tiles update
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary'] });  // optional
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] }); // optional

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