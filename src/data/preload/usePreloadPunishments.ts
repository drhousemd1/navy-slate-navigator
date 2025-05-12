
import { queryClient } from "../queryClient";
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";

export function usePreloadPunishments() {
  return async () => {
    const data = await loadPunishmentsFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(["punishments"], data);
    }
    return null;
  };
}
