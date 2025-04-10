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

      // Final correct timestamp fields
      const timestampColumns: Record<string, string> = {
        task_completion_history: 'completed_at',
        rule_violations: 'violation_date',
        reward_usage: 'redeemed_date',
        punishment_history: 'applied_date',
      };

      const deleteFromTable = async (table: keyof typeof timestampColumns) => {
        const timestampField = timestampColumns[table];
        const { error } = await supabase
          .from(table)
          .delete()
          .gt(timestampField, '1900-01-01');

        if (error) {
          console.error(`Failed to delete from ${table}:`, error.message);
          throw new Error(`Failed to delete from ${table}: ${error.message}`);
        }

        console.log(`Cleared table: ${table}`);
      };

      await deleteFromTable('task_completion_history');
      await deleteFromTable('rule_violations');
      await deleteFromTable('reward_usage');
      await deleteFromTable('punishment_history');

      await queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });

      toast({
        title: 'All activity data has been reset.',
        description: 'Charts and tiles will update shortly.',
      });

    } catch (error: any) {
      console.error("Reset failed:", error.message || error);
      toast({
        title: 'Reset failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span>This will wipe all task, reward, rule, and punishment history data.</span>
      </div>

      <Button
        onClick={handleReset}
        variant="destructive"
        disabled={isResetting}
        className="w-full"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {isResetting ? 'Resetting...' : 'Reset All Activity Data'}
      </Button>
    </div>
  );
};

export default ActivityDataReset;