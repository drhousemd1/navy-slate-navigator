
import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface UseLocalSyncedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  timeoutMs?: number;
  cacheEnabled?: boolean; // Add option to disable caching
}

export function useLocalSyncedData<T>({ 
  key, 
  fetcher,
  timeoutMs = 5000, // Default timeout of 5 seconds
  cacheEnabled = true // Enable caching by default
}: UseLocalSyncedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWithTimeout = useCallback(async () => {
    try {
      // First try to load from localStorage if cache is enabled
      if (cacheEnabled) {
        try {
          const local = localStorage.getItem(key);
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed !== null && typeof parsed === 'object') {
              // Safely set data with the expected type
              setData(parsed as unknown as T);
              setLoading(false);
            }
          }
        } catch (e) {
          console.error(`Invalid JSON in localStorage for key "${key}"`, e);
          // Clear invalid localStorage data
          try {
            localStorage.removeItem(key);
          } catch (storageError) {
            console.warn("Could not clear localStorage", storageError);
          }
          
          toast({
            title: "Warning",
            description: "Cached data was corrupted and has been reset",
            variant: "destructive",
          });
        }
      }

      // Then fetch fresh data with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
      });

      // Race between the actual fetch and the timeout
      const freshData = await Promise.race([
        fetcher(),
        timeoutPromise
      ]) as T;

      setData(freshData);
      setError(null);
      
      // Try to save to localStorage if cache enabled
      if (cacheEnabled) {
        try {
          // First check approximate size to avoid quota errors
          const dataString = JSON.stringify(freshData);
          // Only cache if the data is relatively small (< 3MB)
          if (dataString.length < 3000000) {
            localStorage.setItem(key, dataString);
          } else {
            console.warn(`Data for key "${key}" too large for localStorage (${dataString.length} bytes)`);
          }
        } catch (storageError) {
          console.warn(`Could not save to localStorage: ${storageError}`);
          // Failure to cache shouldn't break functionality
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${key} from Supabase`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch ${key}`));
      
      // Only show toast if we don't have any data to display
      if (!data) {
        toast({
          title: "Connection Error",
          description: "Could not refresh data from the server",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, timeoutMs, cacheEnabled]);

  useEffect(() => {
    fetchWithTimeout();
  }, [fetchWithTimeout]);

  // Add retry capability
  const retry = useCallback(() => {
    setLoading(true);
    fetchWithTimeout();
  }, [fetchWithTimeout]);

  return { data, loading, error, retry };
}
