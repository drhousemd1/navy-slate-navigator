
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';
import { processImageForSave } from '@/utils/image/ruleIntegration';

export type UpdateRuleVariables = { id: string } & Partial<Omit<Rule, 'id'>>;

export const useUpdateRule = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  return useUpdateOptimisticMutation<Rule, Error, UpdateRuleVariables>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY, subUserId, domUserId],
    mutationFn: async (variables: UpdateRuleVariables) => {
      const { id, ...updates } = variables;
      
      // Process image if present
      const { processedUrl, metadata } = await processImageForSave(updates.background_image_url || null);
      
      const updatedData = {
        ...updates,
        background_image_url: processedUrl,
        image_meta: updates.image_meta || metadata,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('rules')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Rule update failed, no data returned.');
      return data as Rule;
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccessCallback: async (updatedRuleData) => {
      logger.debug('[useUpdateRule onSuccessCallback] Rule updated on server, updating IndexedDB and invalidating cache.', updatedRuleData);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.map(r => r.id === updatedRuleData.id ? updatedRuleData : r);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        
        // Add missing query invalidation to ensure fresh data loads
        await queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
        
        logger.debug('[useUpdateRule onSuccessCallback] IndexedDB updated and cache invalidated.');
      } catch (error) {
        logger.error('[useUpdateRule onSuccessCallback] Error updating IndexedDB:', error);
        toastManager.error("Local Save Error", "Rule updated on server, but failed to save changes locally.");
      }
    },
    mutationOptions: {}
  });
};
