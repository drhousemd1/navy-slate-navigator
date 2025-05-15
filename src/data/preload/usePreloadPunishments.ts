
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";

export function usePreloadPunishments() {
  return async () => {
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    const data = await loadPunishmentsFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(["punishments"], data);
    }
    return null;
  };
}
