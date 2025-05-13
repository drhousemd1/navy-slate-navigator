
import { useQuery } from "@tanstack/react-query";
import localforage from "localforage";

export function useProfilePoints() {
  return useQuery({
    queryKey: ["profile_points"],
    queryFn: async () => {
      const stored = await localforage.getItem<{ points: number; dom_points: number }>("profile_points");
      return stored ?? { points: 0, dom_points: 0 };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
