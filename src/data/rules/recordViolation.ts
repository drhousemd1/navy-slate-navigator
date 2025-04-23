
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { getMondayBasedDay } from '@/lib/utils';

export const recordRuleViolationInDb = async (rule: Rule): Promise<void> => {
  const today = new Date();
  const jsDayOfWeek = today.getDay();
  const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
  const currentDay = getMondayBasedDay();

  try {
    // Start a batch operation for atomicity
    const batch = [];
    
    // First, update the usage data for the rule
    const updatedUsageData = [...(rule.usage_data || Array(7).fill(0))];
    updatedUsageData[currentDay] = 1;
    
    // Prepare rule update query
    const ruleUpdatePromise = supabase
      .from('rules')
      .update({
        usage_data: updatedUsageData,
        updated_at: new Date().toISOString()
      })
      .eq('id', rule.id);
      
    batch.push(ruleUpdatePromise);
    
    // Prepare violation record query
    const violationRecordPromise = supabase
      .from('rule_violations')
      .insert({
        rule_id: rule.id,
        violation_date: today.toISOString(),
        day_of_week: jsDayOfWeek,
        week_number: weekNumber
      });
      
    batch.push(violationRecordPromise);
    
    // Execute all promises in parallel
    const results = await Promise.all(batch);
    
    // Check for errors
    const errors = results.filter(r => r.error).map(r => r.error);
    
    if (errors.length > 0) {
      console.error('Errors recording rule violation:', errors);
      throw new Error('Failed to fully record rule violation');
    }
  } catch (error) {
    console.error('Error recording rule violation:', error);
    throw error;
  }
};
