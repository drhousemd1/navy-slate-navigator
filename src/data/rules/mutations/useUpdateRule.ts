
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { imageMetadataToJson } from '@/utils/image/helpers';
import type { Json } from "@/integrations/supabase/types";

export type UpdateRuleVariables = { id: string } & Partial<Omit<Rule, 'id'>>;

export const useUpdateRule = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Rule, Error, UpdateRuleVariables>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY], // Ensure mutable array
    mutationFn: async (variables: UpdateRuleVariables) => {
      const { id, image_meta, background_images, ...updates } = variables;
      
      // Convert ImageMetadata to Json for database storage
      const updatesForSupabase = {
        ...updates,
        updated_at: new Date().toISOString(),
        image_meta: image_meta ? imageMetadataToJson(image_meta) as Json : undefined,
        background_images: background_images as Json,
      };

      const { data, error } = await supabase
        .from('rules')
        .update(updatesForSupabase)
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
      logger.debug('[useUpdateRule onSuccessCallback] Rule updated on server, updating IndexedDB.', updatedRuleData);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.map(r => r.id === updatedRuleData.id ? updatedRuleData : r);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        logger.debug('[useUpdateRule onSuccessCallback] IndexedDB updated with updated rule.');
        // Generic success toast is handled by useUpdateOptimisticMutation
      } catch (error) {
        logger.error('[useUpdateRule onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Save Error", description: "Rule updated on server, but failed to save changes locally." });
      }
    },
    mutationOptions: { 
      // onError was here, it's removed as the optimistic hook handles it.
      // The generic error toast is handled by useUpdateOptimisticMutation.
      // Specific console logging is now omitted.
    }
  });
};
