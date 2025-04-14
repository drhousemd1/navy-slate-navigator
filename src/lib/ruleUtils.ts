
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMondayBasedDay } from "./utils";

export interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data: number[];
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
  created_at?: string;
  updated_at?: string;
}

export const getCurrentDayOfWeek = (): number => {
  return getMondayBasedDay();
};

export const fetchRules = async (): Promise<Rule[]> => {
  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: 'Error fetching rules',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    
    const processedRules = (data as Rule[]).map(rule => {
      if (!rule.usage_data) {
        rule.usage_data = Array(7).fill(0);
      }
      
      if (rule.background_image_url && (!rule.background_images || rule.background_images.length === 0)) {
        rule.background_images = [rule.background_image_url];
      }
      
      if (!rule.carousel_timer) {
        rule.carousel_timer = 5; // Default timer value
      }
      
      return rule;
    });
    
    return processedRules;
  } catch (err) {
    console.error('Unexpected error fetching rules:', err);
    toast({
      title: 'Error fetching rules',
      description: 'Could not fetch rules',
      variant: 'destructive',
    });
    return [];
  }
};

export const updateRuleViolation = async (id: string, violated: boolean): Promise<boolean> => {
  try {
    const { data: ruleData, error: ruleError } = await supabase
      .from('rules')
      .select('*')
      .eq('id', id)
      .single();
    
    if (ruleError) throw ruleError;
    
    const rule = ruleData as Rule;
    
    const usage_data = rule.usage_data || Array(7).fill(0);
    
    if (violated) {
      const dayOfWeek = getCurrentDayOfWeek();
      usage_data[dayOfWeek] = 1;
      
      // Record violation in rule_violations table
      const { error: violationError } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: id,
          violation_date: new Date().toISOString(),
          day_of_week: new Date().getDay(),
          week_number: `${new Date().getFullYear()}-${Math.floor(new Date().getDate() / 7)}`
        });
        
      if (violationError) {
        console.error('Error recording rule violation:', violationError);
      }
    }
    
    const { error } = await supabase
      .from('rules')
      .update({ 
        usage_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (err: any) {
    console.error('Error updating rule violation:', err);
    toast({
      title: 'Error updating rule',
      description: err.message || 'Could not update rule violation status',
      variant: 'destructive',
    });
    return false;
  }
};

export const deleteRule = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (err: any) {
    console.error('Error deleting rule:', err);
    toast({
      title: 'Error deleting rule',
      description: err.message || 'Could not delete rule',
      variant: 'destructive',
    });
    return false;
  }
};
