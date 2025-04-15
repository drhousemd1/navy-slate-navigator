
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface UseLocalSyncedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
}

export function useLocalSyncedData<T>({ key, fetcher }: UseLocalSyncedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // First try to load from localStorage
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
      localStorage.removeItem(key);
      toast({
        title: "Warning",
        description: "Cached data was corrupted and has been reset",
        variant: "destructive",
      });
    }

    // Then fetch fresh data from Supabase
    fetcher()
      .then(freshData => {
        setData(freshData);
        setError(null);
        localStorage.setItem(key, JSON.stringify(freshData));
      })
      .catch(err => {
        console.error(`Failed to fetch ${key} from Supabase`, err);
        setError(err instanceof Error ? err : new Error(`Failed to fetch ${key}`));
        
        if (!data) {  // Only show toast if we don't have any data to display
          toast({
            title: "Connection Error",
            description: "Could not refresh data from the server",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, fetcher]);

  return { data, loading, error };
}
