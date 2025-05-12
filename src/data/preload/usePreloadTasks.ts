
import { queryClient } from "../queryClient";
import { loadTasksFromDB } from "../indexedDB/useIndexedDB";

export async function usePreloadTasks() {
  const data = await loadTasksFromDB();
  if (data && data.length > 0) {
    queryClient.setQueryData(["tasks"], data);
  }
}
