
import { queryClient } from "../queryClient";
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";

export async function usePreloadPunishments() {
  const data = await loadPunishmentsFromDB();
  if (data && data.length > 0) {
    queryClient.setQueryData(["punishments"], data);
  }
}
