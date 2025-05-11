
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { loadRulesFromDB, saveRulesToDB } from '@/data/indexedDB/useIndexedDB';
import { logQueryPerformance } from '@/lib/react-query-config';
import { useEffect, useState } from 'react';

export const RULES_QUERY_KEY = ['rules'];

async function fetchRules(): Promise<Rule[]> {
  const startTime = performance.now();
  console.log('[RulesQuery] Fetching rules from the server');
  
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }
  
  const rules = data.map(rule => ({
    id: rule.id,
    title: rule.title,
    description: rule.description,
    priority: rule.priority as 'low' | 'medium' | 'high',
    background_image_url: rule.background_image_url,
    background_opacity: rule.background_opacity,
    focal_point_x: rule.focal_point_x,
    focal_point_y: rule.focal_point_y,
    frequency: rule.frequency as 'daily' | 'weekly',
    frequency_count: rule.frequency_count,
    usage_data: Array.isArray(rule.usage_data) 
      ? rule.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
      : [0, 0, 0, 0, 0, 0, 0],
    icon_name: rule.icon_name,
    icon_url: rule.icon_url,
    icon_color: rule.icon_color,
    highlight_effect: rule.highlight_effect,
    title_color: rule.title_color,
    subtext_color: rule.subtext_color,
    calendar_color: rule.calendar_color,
    created_at: rule.created_at,
    updated_at: rule.updated_at
  } as Rule));
  
  // Save to IndexedDB
  await saveRulesToDB(rules);
  
  logQueryPerformance('RulesQuery', startTime, rules.length);
  return rules;
}

export function useRulesQuery() {
  const [initialData, setInitialData] = useState<Rule[] | undefined>(undefined);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  
  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const cachedRules = await loadRulesFromDB();
        setInitialData(cachedRules || []);
      } catch (err) {
        console.error('Error loading rules from IndexedDB:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    
    loadInitialData();
  }, []);
  
  const query = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: fetchRules,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1,
    // Only use initialData once it has been loaded from IndexedDB
    initialData: initialData,
    enabled: !isLoadingInitial, // Don't run query until initial loading is done
  });
  
  return {
    ...query,
    // Return cached data while waiting for IndexedDB to load
    data: query.data || initialData || [],
    // Only show loading state if there's no data at all
    isLoading: (query.isLoading || isLoadingInitial) && !initialData?.length
  };
}
