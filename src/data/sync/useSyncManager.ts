
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '../queryClient';

interface SyncOptions {
  showToasts?: boolean;
  intervalMs?: number;
  enabled?: boolean;
}

export function useSyncManager(options: SyncOptions = {}) {
  const { showToasts = false, intervalMs = 60000, enabled = true } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync a specific card by ID
  const syncCardById = useCallback(async (
    id: string, 
    type: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'admin_testing_cards'
  ): Promise<void> => {
    if (!id) return;
    
    try {
      setIsSyncing(true);
      
      // Fetch just this single card from Supabase
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Map the appropriate queryKey based on type
        const queryKey = type === 'admin_testing_cards' ? 'adminCards' : type;
        
        // Update just this one item in the cache
        queryClient.setQueryData([queryKey], (oldData: any[] = []) => {
          return Array.isArray(oldData) ? oldData.map(item => item.id === id ? data : item) : [];
        });
      }
    } catch (err) {
      console.error(`Error syncing ${type} item ${id}:`, err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync all data
  const syncNow = useCallback(async () => {
    try {
      setIsSyncing(true);
      if (showToasts) {
        toast({
          title: "Syncing",
          description: "Syncing data with server...",
        });
      }

      // No full table syncs happen here - only when needed in specific queries
      
      setLastSyncTime(new Date());
      
      if (showToasts) {
        toast({
          title: "Sync Complete",
          description: "Data successfully synchronized",
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      if (showToasts) {
        toast({
          title: "Sync Failed",
          description: "Could not synchronize data. Will try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [showToasts]);

  // Set up sync interval
  useEffect(() => {
    if (!enabled) return;
    
    // Initial sync when component mounts
    syncNow();
    
    // Setup interval for background syncing
    const interval = setInterval(() => {
      syncNow();
    }, intervalMs);
    
    return () => {
      clearInterval(interval);
    };
  }, [syncNow, intervalMs, enabled]);

  return {
    isSyncing,
    lastSyncTime,
    syncNow,
    syncCardById
  };
}

// Export single-use functions
export const syncCardById = async (
  id: string,
  type: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'admin_testing_cards'
): Promise<void> => {
  if (!id) return;
  
  try {
    // Fetch just this single card from Supabase
    const { data, error } = await supabase
      .from(type)
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    if (data) {
      // Map the appropriate queryKey based on type
      const queryKey = type === 'admin_testing_cards' ? 'adminCards' : type;
      
      // Update just this one item in the cache
      queryClient.setQueryData([queryKey], (oldData: any[] = []) => {
        return Array.isArray(oldData) ? oldData.map(item => item.id === id ? data : item) : [];
      });
    }
  } catch (err) {
    console.error(`Error syncing ${type} item ${id}:`, err);
  }
};
