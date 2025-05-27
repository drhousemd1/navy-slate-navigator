import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logQueryPerformance } from '@/lib/react-query-config';
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "@/data/indexedDB/useIndexedDB";
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils';
import { logger } from '@/lib/logger';

// Ensure Rule interface properties used for defaults are correctly defined
const defaultRuleValues = {
  priority: 'medium' as 'low' | 'medium' | 'high',
  frequency: 'daily' as 'daily' | 'weekly',
  frequency_count: 1,
  usage_data: Array(7).fill(0),
  background_opacity: 100,
  highlight_effect: false,
  focal_point_x: 50,
  focal_point_y: 50,
  title_color: '#FFFFFF',
  subtext_color: '#FFFFFF', // Often different, e.g., #D1D5DB or #8E9196
  calendar_color: '#9c7abb',
  icon_color: '#FFFFFF',
};

const processRuleData = (rule: any): Rule => {
  const priority = ['low', 'medium', 'high'].includes(rule.priority) 
    ? (rule.priority as 'low' | 'medium' | 'high') 
    : defaultRuleValues.priority;
  
  let usageData: number[];
  if (Array.isArray(rule.usage_data)) {
    usageData = rule.usage_data.map(item => typeof item === 'number' ? item : 0);
    if (usageData.length !== 7) usageData = defaultRuleValues.usage_data; // Ensure 7 days
  } else {
    usageData = defaultRuleValues.usage_data;
  }

  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    priority: priority,
    background_image_url: rule.background_image_url,
    background_opacity: rule.background_opacity ?? defaultRuleValues.background_opacity,
    icon_url: rule.icon_url,
    icon_name: rule.icon_name,
    title_color: rule.title_color ?? defaultRuleValues.title_color,
    subtext_color: rule.subtext_color ?? defaultRuleValues.subtext_color,
    calendar_color: rule.calendar_color ?? defaultRuleValues.calendar_color,
    icon_color: rule.icon_color ?? defaultRuleValues.icon_color,
    highlight_effect: rule.highlight_effect ?? defaultRuleValues.highlight_effect,
    focal_point_x: rule.focal_point_x ?? defaultRuleValues.focal_point_x,
    focal_point_y: rule.focal_point_y ?? defaultRuleValues.focal_point_y,
    frequency: (rule.frequency as 'daily' | 'weekly') || defaultRuleValues.frequency,
    frequency_count: rule.frequency_count ?? defaultRuleValues.frequency_count,
    usage_data: usageData,
    created_at: rule.created_at,
    updated_at: rule.updated_at,
    user_id: rule.user_id
  };
};


export const fetchRules = async (): Promise<Rule[]> => {
  const localData = await loadRulesFromDB() as Rule[] | null;
  const lastSync = await getLastSyncTimeForRules();
  let shouldFetchFromServer = true;
  const startTime = performance.now();

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) { // 30 minutes
      shouldFetchFromServer = false;
    }
  } else if (localData && localData.length > 0) {
    shouldFetchFromServer = false;
  }

  if (!shouldFetchFromServer && localData) {
    logger.debug('[fetchRules] Returning rules from IndexedDB');
    logQueryPerformance('fetchRules (cache)', startTime, localData.length);
    return localData.map(processRuleData);
  }

  logger.debug('[fetchRules] Fetching rules from server');
  try {
    const { data, error } = await selectWithTimeout<Rule>(
      supabase,
      'rules',
      {
        order: ['created_at', { ascending: false }],
        timeoutMs: DEFAULT_TIMEOUT_MS 
      }
    );

    if (error) {
      logger.error('[fetchRules] Supabase error fetching rules:', error);
      if (localData) {
        logger.warn('[fetchRules] Server fetch failed, returning stale data from IndexedDB');
        logQueryPerformance('fetchRules (error-cache)', startTime, localData.length);
        return localData.map(processRuleData);
      }
      throw error;
    }

    if (data) {
      const rulesFromServer = (Array.isArray(data) ? data : (data ? [data] : [])).map(processRuleData);
      await saveRulesToDB(rulesFromServer);
      await setLastSyncTimeForRules(new Date().toISOString());
      logger.debug('[fetchRules] Rules fetched from server and saved to IndexedDB');
      logQueryPerformance('fetchRules (server)', startTime, rulesFromServer.length);
      return rulesFromServer;
    }
    
    logQueryPerformance('fetchRules (empty-server)', startTime, 0);
    return localData ? localData.map(processRuleData) : [];
  } catch (error) {
    logger.error('[fetchRules] Error fetching rules:', error);
    logQueryPerformance('fetchRules (fetch-exception)', startTime);
     if (localData) {
      logger.warn('[fetchRules] Error fetching rules, using cached data:', error);
      return localData.map(processRuleData);
    }
    throw error;
  }
};
