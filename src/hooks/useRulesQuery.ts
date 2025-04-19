
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

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

// Keys for React Query cache
const RULES_KEY = ['rules'];
const RULE_VIOLATIONS_KEY = ['rule_violations'];

// Fetch all rules
export const fetchRules = async (): Promise<Rule[]> => {
  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data as Rule[] || []).map(rule => {
      if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
        return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
      }
      return rule;
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }
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
  try {
    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', ruleId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
};

// Record a rule violation
export const recordRuleViolation = async (ruleId: string): Promise<{ updatedRule: Rule, violation: RuleViolation }> => {
  try {
    // First, get the current rule to update its usage data
    const { data: ruleData, error: ruleError } = await supabase
      .from('rules')
      .select('*')
      .eq('id', ruleId)
      .single();
      
    if (ruleError) throw ruleError;
    
    const rule = ruleData as Rule;
    
    // Update the usage data for the current day of the week
    const currentDayOfWeek = getMondayBasedDay();
    const newUsageData = [...(rule.usage_data || [0, 0, 0, 0, 0, 0, 0])];
    newUsageData[currentDayOfWeek] = 1;
    
    // Update the rule with new usage data
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
    
    // Record the violation in rule_violations table
    const today = new Date();
    const jsDayOfWeek = today.getDay();
    
    const violationData = {
      rule_id: ruleId,
      violation_date: today.toISOString(),
      day_of_week: jsDayOfWeek,
      week_number: `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`
    };
    
    const { data: violationRecord, error: violationError } = await supabase
      .from('rule_violations')
      .insert(violationData)
      .select()
      .single();
      
    if (violationError) {
      console.error('Error recording rule violation:', violationError);
      // We'll return the updated rule even if violation recording fails
      return { 
        updatedRule: updatedRuleData as Rule, 
        violation: { ...violationData, id: 'error' } 
      };
    }
    
    return { 
      updatedRule: updatedRuleData as Rule, 
      violation: violationRecord as RuleViolation 
    };
  } catch (error) {
    console.error('Error recording rule violation:', error);
    throw error;
  }
};

// Main hook for rule operations
export const useRulesQuery = () => {
  const queryClient = useQueryClient();
  
  // Query for fetching all rules
  const {
    data: rules = [],
    isLoading,
    error
  } = useQuery({
    queryKey: RULES_KEY,
    queryFn: fetchRules,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutation for creating a rule
  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: (newRule) => {
      // Update the cache with new rule
      queryClient.setQueryData(
        RULES_KEY,
        (oldData: Rule[] = []) => [newRule, ...oldData]
      );
      
      toast({
        title: "Success",
        description: "Rule created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create rule. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for updating a rule
  const updateRuleMutation = useMutation({
    mutationFn: updateRule,
    onMutate: async (updatedRule) => {
      // Cancel outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: RULES_KEY });
      
      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_KEY) || [];
      
      // Optimistically update the cache with the new value
      queryClient.setQueryData(
        RULES_KEY,
        (oldData: Rule[] = []) => oldData.map(rule => 
          rule.id === updatedRule.id ? { ...rule, ...updatedRule } : rule
        )
      );
      
      // Return the previous value for rollback
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rule updated successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous value
      if (context?.previousRules) {
        queryClient.setQueryData(RULES_KEY, context.previousRules);
      }
      
      toast({
        title: "Error",
        description: "Failed to update rule. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to make sure our local data is in sync with the server
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    }
  });

  // Mutation for deleting a rule
  const deleteRuleMutation = useMutation({
    mutationFn: deleteRule,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: RULES_KEY });
      
      // Snapshot the previous values
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_KEY) || [];
      
      // Optimistically update caches
      queryClient.setQueryData(
        RULES_KEY,
        (oldData: Rule[] = []) => oldData.filter(rule => rule.id !== id)
      );
      
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous values
      if (context?.previousRules) {
        queryClient.setQueryData(RULES_KEY, context.previousRules);
      }
      
      toast({
        title: "Error",
        description: "Failed to delete rule. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    }
  });
  
  // Mutation for recording a rule violation
  const recordViolationMutation = useMutation({
    mutationFn: recordRuleViolation,
    onMutate: async (ruleId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: RULES_KEY });
      
      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_KEY) || [];
      
      // Optimistically update the rule in the cache
      queryClient.setQueryData(
        RULES_KEY,
        (oldData: Rule[] = []) => oldData.map(rule => {
          if (rule.id !== ruleId) return rule;
          
          // Update the usage data for the current day
          const currentDayOfWeek = getMondayBasedDay();
          const newUsageData = [...(rule.usage_data || [0, 0, 0, 0, 0, 0, 0])];
          newUsageData[currentDayOfWeek] = 1;
          
          return {
            ...rule,
            usage_data: newUsageData
          };
        })
      );
      
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: "Rule Broken",
        description: "This violation has been recorded.",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous value
      if (context?.previousRules) {
        queryClient.setQueryData(RULES_KEY, context.previousRules);
      }
      
      toast({
        title: "Error",
        description: "Failed to record rule violation. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
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
    // Refresh function to force refetch
    refreshRules: () => queryClient.invalidateQueries({ queryKey: RULES_KEY })
  };
};
