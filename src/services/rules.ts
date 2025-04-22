
import { supabase } from '@/services/api/supabase';
import { 
  Rule, 
  CreateRuleInput, 
  UpdateRuleInput, 
  RuleViolation 
} from '@/types/rule.types';
import { format } from 'date-fns';

// Fetch all rules for the current user
export const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Create a new rule
export const createRule = async (ruleData: CreateRuleInput): Promise<Rule> => {
  const { data, error } = await supabase
    .from('rules')
    .insert([{ ...ruleData, user_id: (await supabase.auth.getUser()).data.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Update an existing rule
export const updateRule = async ({ id, ...updates }: UpdateRuleInput): Promise<Rule> => {
  const { data, error } = await supabase
    .from('rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete a rule
export const deleteRule = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Record a rule violation
export const recordRuleViolation = async (ruleId: string): Promise<RuleViolation> => {
  const user = (await supabase.auth.getUser()).data.user;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = format(today, 'yyyy-ww');
  
  const { data, error } = await supabase
    .from('rule_violations')
    .insert([{
      rule_id: ruleId,
      user_id: user.id,
      day_of_week: dayOfWeek,
      week_number: weekNumber
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Get rule violations for a specific week
export const getRuleViolations = async (
  startDate: Date,
  endDate: Date
): Promise<RuleViolation[]> => {
  const { data, error } = await supabase
    .from('rule_violations')
    .select('*')
    .gte('violation_date', startDate.toISOString())
    .lte('violation_date', endDate.toISOString());
  
  if (error) throw error;
  return data || [];
};

// Upload a rule image to Supabase Storage
export const uploadRuleImage = async (
  file: File,
  ruleId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${ruleId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('card_images')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('card_images')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};
