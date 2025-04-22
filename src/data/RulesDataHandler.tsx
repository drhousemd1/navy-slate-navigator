
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

// Define Rule type
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

// Keys for our queries
const RULES_QUERY_KEY = ['rules'];

// Fetch rules from the database
const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }
  
  const rulesWithUsageData = (data as Rule[] || []).map(rule => {
    if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
      return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
    }
    return rule;
  });
  
  return rulesWithUsageData;
};

// Save a rule to the database
const saveRuleToDb = async (ruleData: Partial<Rule>): Promise<Rule> => {
  if (ruleData.id) {
    // Update existing rule
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
      
    if (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
    
    return data;
  } else {
    // Create new rule
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
      
    if (error) {
      console.error('Error creating rule:', error);
      throw error;
    }
    
    return data;
  }
};

// Delete a rule from the database
const deleteRuleFromDb = async (ruleId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId);
  
  if (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
  
  return true;
};

// Record rule violation
const recordRuleViolationInDb = async (rule: Rule): Promise<void> => {
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

// The main hook to expose all rule-related operations
export const useRulesData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all rules
  const {
    data: rules = [],
    isLoading,
    error,
    refetch: refetchRules
  } = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: fetchRules,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Mutation for saving a rule (create or update)
  const saveRuleMutation = useMutation({
    mutationFn: saveRuleToDb,
    onMutate: async (newRule) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_QUERY_KEY) || [];
      
      // Optimistically update the cache with the new rule
      if (newRule.id) {
        // Updating existing rule
        queryClient.setQueryData<Rule[]>(
          RULES_QUERY_KEY, 
          previousRules.map(r => 
            r.id === newRule.id 
              ? { ...r, ...newRule, updated_at: new Date().toISOString() } 
              : r
          )
        );
      } else {
        // Creating new rule
        const tempId = `temp-${Date.now()}`;
        const optimisticRule: Rule = {
          id: tempId,
          title: newRule.title || 'New Rule',
          description: newRule.description || '',
          priority: newRule.priority || 'medium',
          background_image_url: newRule.background_image_url,
          background_opacity: newRule.background_opacity || 100,
          icon_url: newRule.icon_url,
          icon_name: newRule.icon_name,
          title_color: newRule.title_color || '#FFFFFF',
          subtext_color: newRule.subtext_color || '#FFFFFF',
          calendar_color: newRule.calendar_color || '#9c7abb',
          icon_color: newRule.icon_color || '#FFFFFF',
          highlight_effect: newRule.highlight_effect || false,
          focal_point_x: newRule.focal_point_x || 50,
          focal_point_y: newRule.focal_point_y || 50,
          frequency: newRule.frequency || 'daily',
          frequency_count: newRule.frequency_count || 3,
          usage_data: [0, 0, 0, 0, 0, 0, 0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        queryClient.setQueryData<Rule[]>(
          RULES_QUERY_KEY, 
          [optimisticRule, ...previousRules]
        );
      }
      
      return { previousRules };
    },
    onError: (err, newRule, context) => {
      console.error('Error saving rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(RULES_QUERY_KEY, context.previousRules);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    }
  });

  // Mutation for deleting a rule
  const deleteRuleMutation = useMutation({
    mutationFn: deleteRuleFromDb,
    onMutate: async (ruleId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_QUERY_KEY) || [];
      
      // Optimistically update the cache by removing the deleted rule
      queryClient.setQueryData<Rule[]>(
        RULES_QUERY_KEY, 
        previousRules.filter(r => r.id !== ruleId)
      );
      
      return { previousRules };
    },
    onError: (err, ruleId, context) => {
      console.error('Error deleting rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(RULES_QUERY_KEY, context.previousRules);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    }
  });

  // Mutation for marking a rule as broken
  const markRuleBrokenMutation = useMutation({
    mutationFn: recordRuleViolationInDb,
    onMutate: async (rule) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      
      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_QUERY_KEY) || [];
      
      // Update the usage data for the rule
      const currentDay = getMondayBasedDay();
      const updatedRules = previousRules.map(r => {
        if (r.id === rule.id) {
          const updatedUsageData = [...(r.usage_data || Array(7).fill(0))];
          updatedUsageData[currentDay] = 1;
          return { ...r, usage_data: updatedUsageData };
        }
        return r;
      });
      
      // Optimistically update the cache
      queryClient.setQueryData(RULES_QUERY_KEY, updatedRules);
      
      return { previousRules };
    },
    onError: (err, rule, context) => {
      console.error('Error marking rule as broken:', err);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(RULES_QUERY_KEY, context.previousRules);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    }
  });

  return {
    // Data
    rules,
    
    // Loading state
    isLoading,
    error,
    
    // Rules CRUD operations
    saveRule: (ruleData: Partial<Rule>) => saveRuleMutation.mutateAsync(ruleData),
    deleteRule: (ruleId: string) => deleteRuleMutation.mutateAsync(ruleId),
    markRuleBroken: (rule: Rule) => markRuleBrokenMutation.mutateAsync(rule),
    
    // Refetch function
    refetchRules
  };
};
