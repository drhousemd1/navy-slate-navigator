
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  getLastSyncTimeForPunishments,
  setLastSyncTimeForPunishments
} from "@/data/indexedDB/useIndexedDB";
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils'; // Added selectWithTimeout
import { PostgrestError } from '@supabase/supabase-js';

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  const localData = await loadPunishmentsFromDB() as PunishmentData[] | null;
  const lastSync = await getLastSyncTimeForPunishments();
  let shouldFetchFromServer = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    // Sync if data is older than 30 minutes or if no local data
    if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) {
      shouldFetchFromServer = false;
    }
  } else if (localData && localData.length > 0) {
    // If no lastSync but local data exists, use it for the first load
    shouldFetchFromServer = false;
  }

  if (!shouldFetchFromServer && localData) {
    console.log('[fetchPunishments] Returning punishments from IndexedDB');
    return localData.map(p => ({
      ...p,
      // Ensure defaults for fields that might be missing in older cached data
      // These defaults should match the table structure or application logic
      dom_supply: p.dom_supply ?? 0,
      background_opacity: p.background_opacity ?? 50,
      highlight_effect: p.highlight_effect ?? false,
      focal_point_x: p.focal_point_x ?? 50,
      focal_point_y: p.focal_point_y ?? 50,
      icon_color: p.icon_color ?? '#ea384c',
      title_color: p.title_color ?? '#FFFFFF',
      subtext_color: p.subtext_color ?? '#8E9196',
      calendar_color: p.calendar_color ?? '#ea384c',
    }));
  }

  console.log('[fetchPunishments] Fetching punishments from server');
  
  try {
    const { data, error } = await selectWithTimeout<PunishmentData>(
      supabase,
      'punishments',
      {
        order: ['created_at', { ascending: false }],
        timeoutMs: DEFAULT_TIMEOUT_MS
      }
    );

    if (error) {
      console.error('[fetchPunishments] Supabase error fetching punishments:', error);
      if (localData) {
        console.warn('[fetchPunishments] Server fetch failed, returning stale data from IndexedDB');
        return localData.map(p => ({
          ...p,
          dom_supply: p.dom_supply ?? 0,
          background_opacity: p.background_opacity ?? 50,
          highlight_effect: p.highlight_effect ?? false,
          focal_point_x: p.focal_point_x ?? 50,
          focal_point_y: p.focal_point_y ?? 50,
          icon_color: p.icon_color ?? '#ea384c',
          title_color: p.title_color ?? '#FFFFFF',
          subtext_color: p.subtext_color ?? '#8E9196',
          calendar_color: p.calendar_color ?? '#ea384c',
        }));
      }
      throw error;
    }

    if (data) {
      // The selectWithTimeout already returns RowType[] if single is false (default)
      const punishmentsFromServer = (Array.isArray(data) ? data : (data ? [data] : [])).map(p => ({
        ...p,
        // Ensure defaults after fetching from server as well
        dom_supply: p.dom_supply ?? 0,
        background_opacity: p.background_opacity ?? 50,
        highlight_effect: p.highlight_effect ?? false,
        focal_point_x: p.focal_point_x ?? 50,
        focal_point_y: p.focal_point_y ?? 50,
        icon_color: p.icon_color ?? '#ea384c',
        title_color: p.title_color ?? '#FFFFFF',
        subtext_color: p.subtext_color ?? '#8E9196',
        calendar_color: p.calendar_color ?? '#ea384c',
      })) as PunishmentData[];
      
      await savePunishmentsToDB(punishmentsFromServer);
      await setLastSyncTimeForPunishments(new Date().toISOString());
      console.log('[fetchPunishments] Punishments fetched from server and saved to IndexedDB');
      return punishmentsFromServer;
    }

    return localData ? localData.map(p => ({
      ...p,
      dom_supply: p.dom_supply ?? 0,
      background_opacity: p.background_opacity ?? 50,
      highlight_effect: p.highlight_effect ?? false,
      focal_point_x: p.focal_point_x ?? 50,
      focal_point_y: p.focal_point_y ?? 50,
      icon_color: p.icon_color ?? '#ea384c',
      title_color: p.title_color ?? '#FFFFFF',
      subtext_color: p.subtext_color ?? '#8E9196',
      calendar_color: p.calendar_color ?? '#ea384c',
    })) : [];
  } catch (error) {
    console.error('[fetchPunishments] Error fetching punishments:', error);
    if (localData) {
      console.warn('[fetchPunishments] Error fetching punishments, using cached data:', error);
      return localData.map(p => ({
        ...p,
        dom_supply: p.dom_supply ?? 0,
        background_opacity: p.background_opacity ?? 50,
        highlight_effect: p.highlight_effect ?? false,
        focal_point_x: p.focal_point_x ?? 50,
        focal_point_y: p.focal_point_y ?? 50,
        icon_color: p.icon_color ?? '#ea384c',
        title_color: p.title_color ?? '#FFFFFF',
        subtext_color: p.subtext_color ?? '#8E9196',
        calendar_color: p.calendar_color ?? '#ea384c',
      }));
    }
    throw error;
  }
};
