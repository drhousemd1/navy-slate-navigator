// src/data/RuleDataHandler.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Rule {
  id?: string;
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
  usage_data?: number[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

// Function to fetch rules from Supabase
const fetchRules = async () => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Rule[];
};

// useQuery hook to fetch rules
export const useRules = () => {
  return useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
    staleTime: 1000 * 60 * 20,       // Consider data fresh for 20 minutes
    cacheTime: 1000 * 60 * 30,       // Keep data in memory for 30 minutes after inactive
    refetchOnWindowFocus: false      // Avoid refetch when switching back to tab
  });
};

// Function to update a rule in Supabase
const updateRule = async (rule: Partial<Rule>) => {
  const { data, error } = await supabase
    .from('rules')
    .update(rule)
    .eq('id', rule.id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to update a rule
export const useUpdateRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRule,
    onMutate: async (updatedRule) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rules'] });

      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(['rules']);

      // Optimistically update to the new value
      queryClient.setQueryData<Rule[]>(['rules'], (old) =>
        old?.map((rule) =>
          rule.id === updatedRule.id ? { ...rule, ...updatedRule } : rule
        ) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousRules };
    },
    onError: (err, updatedRule, context: any) => {
      queryClient.setQueryData<Rule[]>(['rules'], context.previousRules);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
};

// Function to create a rule in Supabase
const createRule = async (rule: Partial<Rule>) => {
  const { data, error } = await supabase
    .from('rules')
    .insert(rule)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to create a rule
export const useCreateRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRule,
    onMutate: async (newRule) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rules'] });

      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(['rules']);

      // Optimistically update to the new value
      queryClient.setQueryData<Rule[]>(['rules'], (old) => [...(old ?? []), { ...newRule, id: 'temp_id' }]); // Assign a temporary ID

      // Return a context object with the snapshotted value
      return { previousRules };
    },
    onError: (err, newRule, context: any) => {
      queryClient.setQueryData<Rule[]>(['rules'], context.previousRules);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
};

// Function to delete a rule in Supabase
const deleteRule = async (ruleId: string) => {
  const { data, error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to delete a rule
export const useDeleteRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRule,
    onMutate: async (ruleId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rules'] });

      // Snapshot the previous value
      const previousRules = queryClient.getQueryData<Rule[]>(['rules']);

      // Optimistically update to the new value
      queryClient.setQueryData<Rule[]>(['rules'], (old) =>
        old?.filter((rule) => rule.id !== ruleId) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousRules };
    },
    onError: (err, ruleId, context: any) => {
      queryClient.setQueryData<Rule[]>(['rules'], context.previousRules);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
};
