
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { getMondayBasedDay } from '@/lib/utils';

export const recordRuleViolationInDb = async (rule: Rule): Promise<void> => {
  const today = new Date();
  const jsDayOfWeek = today.getDay();
  const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
  const currentDay = getMondayBasedDay();

  // Update the usage data for the rule
  const updatedUsageData = [...(rule.usage_data || Array(7).fill(0))];
  updatedUsageData[currentDay] = 1;

  // First, update the rule's usage data
  const { error: updateError } = await supabase
    .from('rules')
    .update({
      usage_data: updatedUsageData,
      updated_at: new Date().toISOString()
    })
    .eq('id', rule.id);

  if (updateError) {
    console.error('Error updating rule usage data:', updateError);
    throw updateError;
  }

  // Then, record the violation
  const { error: violationError } = await supabase
    .from('rule_violations')
    .insert({
      rule_id: rule.id,
      violation_date: today.toISOString(),
      day_of_week: jsDayOfWeek,
      week_number: weekNumber
    });

  if (violationError) {
    console.error('Error recording rule violation:', violationError);
    throw violationError;
  }
};

