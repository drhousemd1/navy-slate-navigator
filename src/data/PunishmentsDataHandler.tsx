
export { usePunishmentsData } from './punishments/usePunishmentsData';
export { useRewardsData } from './rewards/useRewardsData';

import { useCreatePunishment } from "@/data/mutations/useCreatePunishment";
import { useRedeemPunishment } from "@/data/mutations/useRedeemPunishment";
import { useDeletePunishment } from "@/data/mutations/useDeletePunishment";

// Export wrapper functions
export async function savePunishmentInDb(obj: any, profileId: string): Promise<boolean> {
  const { mutateAsync } = useCreatePunishment();
  await mutateAsync({ ...obj, profile_id: profileId });
  return true;
}

export async function redeemPunishmentInDb(args: any): Promise<boolean> {
  const { mutateAsync } = useRedeemPunishment();
  await mutateAsync(args);
  return true;
}

export async function deletePunishmentInDb(id: string): Promise<boolean> {
  const { mutateAsync } = useDeletePunishment();
  await mutateAsync(id);
  return true;
}
