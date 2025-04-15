
import { useState, useEffect } from "react";

interface UseLocalSyncedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
}

export function useLocalSyncedData<T>({ key, fetcher }: UseLocalSyncedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = localStorage.getItem(key);
    if (local) {
      setData(JSON.parse(local));
      setLoading(false);
    }

    fetcher()
      .then(freshData => {
        setData(freshData);
        localStorage.setItem(key, JSON.stringify(freshData));
      })
      .catch((err) => {
        console.error(`Failed to fetch ${key} from Supabase`, err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, fetcher]);

  return { data, loading };
}
