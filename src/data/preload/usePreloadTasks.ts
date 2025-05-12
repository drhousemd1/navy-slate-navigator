
import { queryClient } from "../queryClient";
import { loadTasksFromDB } from "../indexedDB/useIndexedDB";

export function usePreloadTasks() {
  return async () => {
    const data = await loadTasksFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(["tasks"], data);
    }
    return null;
  };
}
