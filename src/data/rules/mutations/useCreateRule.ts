
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/auth';
import { useUserIds } from '@/contexts/UserIdsContext';
import { processImageForSave } from '@/utils/image/ruleIntegration';

export type CreateRuleVariables = Partial<Omit<Rule, 'id' | 'created_at' | 'updated_at' | 'usage_data' | 'user_id'>> & {
  title: string;
  user_id: string; // Make user_id required
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { subUserId, domUserId } = useUserIds();

  return useCreateOptimisticMutation<Rule, Error, CreateRuleVariables>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY, subUserId, domUserId],
    mutationFn: async (variables: CreateRuleVariables) => {
      // Ensure user is authenticated
      if (!user?.id) {
        throw new Error('User must be authenticated to create rules');
      }

      // Process image if present
      const { processedUrl, metadata } = await processImageForSave(variables.background_image_url || null);

      // Ensure user_id is set to current authenticated user
      const ruleData = {
        ...variables,
        user_id: user.id, // Always use current authenticated user
        background_image_url: processedUrl,
        image_meta: variables.image_meta || metadata,
      };

      const { data, error } = await supabase
        .from('rules')
        .insert(ruleData)
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Rule creation failed, no data returned.');
      return data as Rule;
    },
    entityName: 'Rule',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        usage_data: [],
        // Default values based on schema
        title_color: '#FFFFFF',
        background_opacity: 100,
        highlight_effect: false,
        focal_point_x: 50,
        focal_point_y: 50,
        frequency_count: 3,
        subtext_color: '#FFFFFF',
        calendar_color: '#9c7abb',
        icon_color: '#FFFFFF',
        frequency: 'daily',
        priority: 'medium',
        user_id: user?.id || '',
        ...variables,
      } as Rule;
    },
    onSuccessCallback: async (newRuleData) => {
      logger.debug('[useCreateRule onSuccessCallback] New rule created on server, updating IndexedDB only.', newRuleData);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = [newRuleData, ...localRules.filter(r => r.id !== newRuleData.id && r.id !== (newRuleData as any).optimisticId)];
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        logger.debug('[useCreateRule onSuccessCallback] IndexedDB updated with new rule.');
      } catch (error) {
        logger.error('[useCreateRule onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Save Error", description: "Rule created on server, but failed to save locally." });
      }
    },
    mutationOptions: {}
  });
};
