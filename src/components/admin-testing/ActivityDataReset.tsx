import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

const ActivityDataReset: React.FC = () => {
  const handleResetActivityData = async () => {
    try {
      // Delete all records from task_completion_history
      const { error: taskHistoryError } = await supabase
        .from('task_completion_history')
        .delete()
        .neq('id', null);

      if (taskHistoryError) {
        console.error("Error deleting from task_completion_history:", taskHistoryError);
        toast({
          title: 'Error',
          description: 'Failed to reset task completion history',
          variant: 'destructive'
        });
        return;
      }

      // Delete all records from punishment_history
      const { error: punishmentHistoryError } = await supabase
        .from('punishment_history')
        .delete()
        .neq('id', null);

      if (punishmentHistoryError) {
        console.error("Error deleting from punishment_history:", punishmentHistoryError);
        toast({
          title: 'Error',
          description: 'Failed to reset punishment history',
          variant: 'destructive'
        });
        return;
      }

      // Reset usage_data in rules table
      const { error: resetRulesError } = await supabase
        .from('rules')
        .update({ usage_data: Array(7).fill(0) })
        .neq('id', null);

      if (resetRulesError) {
        console.error("Error resetting usage_data in rules:", resetRulesError);
        toast({
          title: 'Error',
          description: 'Failed to reset rules usage data',
          variant: 'destructive'
        });
        return;
      }

      // Reset usage_data in tasks table
      const { error: resetTasksError } = await supabase
        .from('tasks')
        .update({ usage_data: Array(7).fill(0) })
        .neq('id', null);

      if (resetTasksError) {
        console.error("Error resetting usage_data in tasks:", resetTasksError);
        toast({
          title: 'Error',
          description: 'Failed to reset tasks usage data',
          variant: 'destructive'
        });
        return;
      }

      // Find the toast call and remove the duration property
      toast({
        title: 'Success',
        description: 'All activity data has been reset successfully',
        variant: 'default'
      });

    } catch (error) {
      console.error("Error resetting activity data:", error);
      toast({
        title: 'Error',
        description: 'Failed to reset activity data',
        variant: 'destructive'
      });
    }
  };

  return (
    <Button onClick={handleResetActivityData} variant="destructive">
      Reset All Activity Data
    </Button>
  );
};

export default ActivityDataReset;
