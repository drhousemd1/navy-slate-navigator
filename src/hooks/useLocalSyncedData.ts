
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseLocalSyncedDataOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T[]>;
  onError?: (error: Error) => void;
  validationFn?: (data: unknown) => boolean;
  cacheTTL?: number; // Cache time-to-live in minutes (default: 30 minutes)
}

interface UseLocalSyncedDataResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateLocalItem: (item: T, idField?: keyof T) => void;
  removeLocalItem: (id: string | number, idField?: keyof T) => void;
}

export function useLocalSyncedData<T>({
  cacheKey,
  fetchFn,
  onError,
  validationFn = (data) => Array.isArray(data),
  cacheTTL = 30
}: UseLocalSyncedDataOptions<T>): UseLocalSyncedDataResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Function to retrieve data from local storage
  const getLocalData = useCallback((): T[] | null => {
    try {
      const storedData = localStorage.getItem(cacheKey);
      if (!storedData) return null;

      const { timestamp, data } = JSON.parse(storedData);
      
      // Check if cache is expired (TTL in minutes converted to milliseconds)
      const isExpired = Date.now() - timestamp > cacheTTL * 60 * 1000;
      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      if (!validationFn(data)) {
        console.warn(`Invalid data structure in localStorage for key "${cacheKey}"`);
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return data as T[];
    } catch (err) {
      console.error(`Error parsing localStorage data for key "${cacheKey}"`, err);
      localStorage.removeItem(cacheKey);
      toast({
        title: "Cache Error",
        description: "Corrupted local data has been cleared",
        variant: "destructive"
      });
      return null;
    }
  }, [cacheKey, validationFn, cacheTTL]);
  
  // Function to save data to local storage
  const saveLocalData = useCallback((newData: T[]) => {
    try {
      const storageItem = {
        timestamp: Date.now(),
        data: newData
      };
      
      // Try to store with size check to prevent quota errors
      const serialized = JSON.stringify(storageItem);
      
      // If serialized data is too large (> 2MB), don't store
      if (serialized.length > 2 * 1024 * 1024) {
        console.warn(`Data for "${cacheKey}" exceeds localStorage size limit, not caching`);
        return;
      }
      
      localStorage.setItem(cacheKey, serialized);
      setLastFetch(Date.now());
    } catch (err) {
      console.error(`Error saving to localStorage for key "${cacheKey}"`, err);
      // Silent fail - we don't want to interrupt the user flow for storage errors
    }
  }, [cacheKey]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Fetch request timed out')), 10000); // 10 second timeout
    });
    
    try {
      // Race the fetch against the timeout
      const newData = await Promise.race([
        fetchFn(),
        timeoutPromise
      ]) as T[];
      
      setData(newData);
      setError(null);
      saveLocalData(newData);
      setLoading(false);
      return newData;
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Unknown fetch error');
      setError(fetchError);
      
      if (onError) {
        onError(fetchError);
      }
      
      // Only show error toast if we don't have any data to show
      if (!data) {
        toast({
          title: "Connection Error",
          description: "Failed to fetch data from server",
          variant: "destructive"
        });
      }
      
      setLoading(false);
      return null;
    }
  }, [fetchFn, saveLocalData, data, onError]);

  // Function to update a single item in the local state and storage
  const updateLocalItem = useCallback((updatedItem: T, idField: keyof T = 'id' as keyof T) => {
    setData(prevData => {
      if (!prevData) return [updatedItem];
      
      const updatedData = prevData.map(item => 
        (item as any)[idField] === (updatedItem as any)[idField] ? updatedItem : item
      );
      
      // If the item doesn't exist in the array, add it
      if (!updatedData.some(item => (item as any)[idField] === (updatedItem as any)[idField])) {
        updatedData.push(updatedItem);
      }
      
      saveLocalData(updatedData);
      return updatedData;
    });
  }, [saveLocalData]);

  // Function to remove a single item from the local state and storage
  const removeLocalItem = useCallback((id: string | number, idField: keyof T = 'id' as keyof T) => {
    setData(prevData => {
      if (!prevData) return null;
      
      const updatedData = prevData.filter(item => (item as any)[idField] !== id);
      saveLocalData(updatedData);
      return updatedData;
    });
  }, [saveLocalData]);

  // Initialize data on component mount
  useEffect(() => {
    // Get data from localStorage first
    const localData = getLocalData();
    if (localData) {
      setData(localData);
      setLoading(false);
    }
    
    // Then fetch fresh data from API anyway
    fetchData().catch(err => {
      console.error('Background refresh failed:', err);
      // Already handled in fetchData
    });
    
    // Set up periodic refresh (every 5 minutes) if component stays mounted
    const refreshInterval = setInterval(() => {
      // Only refresh if it's been more than 5 minutes since the last successful fetch
      if (Date.now() - lastFetch > 5 * 60 * 1000) {
        fetchData().catch(console.error);
      }
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchData, getLocalData, lastFetch]);

  // Public API for refetching
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, updateLocalItem, removeLocalItem };
}
