import { requireCurrentCacheToken, readCacheSnapshot, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  getLastSyncTimeForPunishments } from "@/data/indexedDB/useIndexedDB";
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils';
import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const fetchPunishments = async (subUserId: string | null, domUserId: string | null, cacheToken: CacheToken | null = captureCacheToken()): Promise<PunishmentData[]> => {
  if (!subUserId && !domUserId) {
    logger.debug('[fetchPunishments] No user IDs provided, returning empty array');
    return [];
  }

  const snapshot = await readCacheSnapshot<PunishmentData[]>('punishments', cacheToken);
      const localData = snapshot?.data ?? null;
      const lastSync = snapshot?.savedAt ?? null;
  let shouldFetchFromServer = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    // Sync if data is older than 30 minutes or if no local data
    if (timeDiff < 1000 * 60 * 30 && localData !== null) {
      shouldFetchFromServer = false;
    }
  } else if (localData !== null) {
    // If no lastSync but local data exists, use it for the first load
    shouldFetchFromServer = false;
  }

  if (!shouldFetchFromServer && localData) {
    logger.debug('[fetchPunishments] Returning punishments from IndexedDB');
    requireCurrentCacheToken(cacheToken);
    return localData.map(p => ({
      ...p,
      // Ensure defaults for fields that might be missing in older cached data
      dom_supply: p.dom_supply ?? 0,
      background_opacity: p.background_opacity ?? 50,
      highlight_effect: p.highlight_effect ?? false,
      focal_point_x: p.focal_point_x ?? 50,
      focal_point_y: p.focal_point_y ?? 50,
      icon_color: p.icon_color ?? '#ea384c',
      title_color: p.title_color ?? '#FFFFFF',
      subtext_color: p.subtext_color ?? '#8E9196',
      calendar_color: p.calendar_color ?? '#ea384c' }));
  }

  logger.debug('[fetchPunishments] Fetching punishments from server with user filtering');

  try {
    // Build user filter - include both sub and dom user IDs for partner sharing
    const userIds = [subUserId, domUserId].filter(Boolean);

    if (userIds.length === 0) {
      logger.warn('[fetchPunishments] No valid user IDs for filtering');
      return [];
    }

    const { data, error } = await supabase
      .from('punishments')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[fetchPunishments] Supabase error fetching punishments:', error);
      if (localData) {
        logger.warn('[fetchPunishments] Server fetch failed, returning cached data from IndexedDB');
        requireCurrentCacheToken(cacheToken);
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
          calendar_color: p.calendar_color ?? '#ea384c' }));
      }
      throw error;
    }

    if (data) {
      const punishmentsFromServer = data.map(p => ({
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
        calendar_color: p.calendar_color ?? '#ea384c' })) as PunishmentData[];

      // Only save to IndexedDB if we successfully fetched from server
      try { await savePunishmentsToDB(punishmentsFromServer, cacheToken); } catch (error) { requireCurrentCacheToken(cacheToken); logger.warn('Server data loaded, but the device snapshot could not be saved.', error); }

      logger.debug('[fetchPunishments] Punishments fetched from server and saved to IndexedDB');
      requireCurrentCacheToken(cacheToken);
      return punishmentsFromServer;
    }

    // If no server data but have local data, return local data
    requireCurrentCacheToken(cacheToken);
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
      calendar_color: p.calendar_color ?? '#ea384c' })) : [];
  } catch (error) {
    logger.error('[fetchPunishments] Error fetching punishments:', error);
    if (localData) {
      logger.warn('[fetchPunishments] Using cached data due to server error');
      requireCurrentCacheToken(cacheToken);
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
        calendar_color: p.calendar_color ?? '#ea384c' }));
    }
    throw error;
  }
};
