import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';
import React from 'react';

// Types for our rules
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
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface RuleViolation {
  id?: string;
  rule_id: string;
  violation_date: string;
  day_of_week: number;
  week_number: string;
}

// Simple string key for cache - reverting to original format that worked
const RULES_CACHE_KEY = 'rules';

// Fetch all rules
export const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Rule[];
};

// Create a new rule
export const createRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
  try {
    const { id, ...ruleWithoutId } = ruleData;
    
    if (!ruleWithoutId.title) {
      throw new Error('Rule title is required');
    }
    
    const newRule = {
      title: ruleWithoutId.title,
      priority: ruleWithoutId.priority || 'medium',
      background_opacity: ruleWithoutId.background_opacity || 100,
      icon_color: ruleWithoutId.icon_color || '#FFFFFF',
      title_color: ruleWithoutId.title_color || '#FFFFFF', 
      subtext_color: ruleWithoutId.subtext_color || '#FFFFFF',
      calendar_color: ruleWithoutId.calendar_color || '#9c7abb',
      highlight_effect: ruleWithoutId.highlight_effect || false,
      focal_point_x: ruleWithoutId.focal_point_x || 50,
      focal_point_y: ruleWithoutId.focal_point_y || 50,
      frequency: ruleWithoutId.frequency || 'daily',
      frequency_count: ruleWithoutId.frequency_count || 3,
      usage_data: [0, 0, 0, 0, 0, 0, 0],
      ...(ruleWithoutId.description && { description: ruleWithoutId.description }),
      ...(ruleWithoutId.background_image_url && { background_image_url: ruleWithoutId.background_image_url }),
      ...(ruleWithoutId.icon_url && { icon_url: ruleWithoutId.icon_url }),
      ...(ruleWithoutId.icon_name && { icon_name: ruleWithoutId.icon_name }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };
    
    const { data, error } = await supabase
      .from('rules')
      .insert(newRule)
      .select()
      .single();
      
    if (error) throw error;
    return data as Rule;
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
};

// Update an existing rule
export const updateRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
  try {
    if (!ruleData.id) {
      throw new Error('Rule ID is required for updates');
    }
    
    const { data, error } = await supabase
      .from('rules')
      .update({
        title: ruleData.title,
        description: ruleData.description,
        priority: ruleData.priority,
        background_image_url: ruleData.background_image_url,
        background_opacity: ruleData.background_opacity,
        icon_url: ruleData.icon_url,
        icon_name: ruleData.icon_name,
        title_color: ruleData.title_color,
        subtext_color: ruleData.subtext_color,
        calendar_color: ruleData.calendar_color,
        icon_color: ruleData.icon_color,
        highlight_effect: ruleData.highlight_effect,
        focal_point_x: ruleData.focal_point_x,
        focal_point_y: ruleData.focal_point_y,
        frequency: ruleData.frequency,
        frequency_count: ruleData.frequency_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleData.id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Rule;
  } catch (error) {
    console.error('Error updating rule:', error);
    throw error;
  }
};

// Delete a rule
export const deleteRule = async (ruleId: string): Promise<void> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId);
  
  if (error) throw error;
};

// Record a rule violation
export const recordRuleViolation = async (ruleId: string): Promise<{ updatedRule: Rule, violation: RuleViolation }> => {
  try {
    // Get the current rule
    const { data: ruleData, error: ruleError } = await supabase
      .from('rules')
      .select('*')
      .eq('id', ruleId)
      .single();
      
    if (ruleError) throw ruleError;
    const rule = ruleData as Rule;
    
    // Update usage data
    const currentDayOfWeek = getMondayBasedDay();
    const newUsageData = [...(rule.usage_data || [0, 0, 0, 0, 0, 0, 0])];
    newUsageData[currentDayOfWeek] = 1;
    
    // Update rule with new usage data
    const { data: updatedRuleData, error: updateError } = await supabase
      .from('rules')
      .update({
        usage_data: newUsageData,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    // Record violation
    const today = new Date();
    const violationData = {
      rule_id: ruleId,
      violation_date: today.toISOString(),
      day_of_week: today.getDay(),
      week_number: `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`
    };
    
    const { data: violationRecord, error: violationError } = await supabase
      .from('rule_violations')
      .insert(violationData)
      .select()
      .single();
      
    if (violationError) throw violationError;
    
    return { 
      updatedRule: updatedRuleData as Rule,
      violation: violationRecord as RuleViolation
    };
  } catch (error) {
    console.error('Error recording violation:', error);
    throw error;
  }
};

export const useRulesQuery = () => {
  const queryClient = useQueryClient();

  // Simplified query without queryConfig wrapper
  const {
    data: rules = [],
    isLoading,
    error
  } = useQuery({
    queryKey: RULES_CACHE_KEY,
    queryFn: fetchRules,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  // Optimized create mutation
  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: (newRule) => {
      queryClient.setQueryData(RULES_CACHE_KEY, (oldData: Rule[] = []) => [newRule, ...oldData]);
      toast({ title: "Success", description: "Rule created successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create rule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Optimized update mutation
  const updateRuleMutation = useMutation({
    mutationFn: updateRule,
    onSuccess: (updatedRule) => {
      queryClient.setQueryData(RULES_CACHE_KEY, (oldData: Rule[] = []) => 
        oldData.map(rule => rule.id === updatedRule.id ? updatedRule : rule)
      );
      toast({ title: "Success", description: "Rule updated successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update rule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Optimized delete mutation
  const deleteRuleMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(RULES_CACHE_KEY, (oldData: Rule[] = []) => 
        oldData.filter(rule => rule.id !== deletedId)
      );
      toast({ title: "Success", description: "Rule deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Optimized violation mutation
  const recordViolationMutation = useMutation({
    mutationFn: recordRuleViolation,
    onSuccess: ({ updatedRule }) => {
      queryClient.setQueryData(RULES_CACHE_KEY, (oldData: Rule[] = []) => 
        oldData.map(rule => rule.id === updatedRule.id ? updatedRule : rule)
      );
      toast({
        title: "Rule Broken",
        description: "This violation has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record rule violation. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    rules,
    isLoading,
    error: error ? (error as Error) : null,
    createRule: (data: Partial<Rule>) => createRuleMutation.mutateAsync(data),
    updateRule: (data: Partial<Rule>) => updateRuleMutation.mutateAsync(data),
    deleteRule: (id: string) => deleteRuleMutation.mutateAsync(id),
    recordViolation: (ruleId: string) => recordViolationMutation.mutateAsync(ruleId),
    refreshRules: () => queryClient.invalidateQueries({ queryKey: RULES_CACHE_KEY })
  };
};
