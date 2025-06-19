
import { toastManager } from '@/lib/toastManager';

export const usePunishmentToast = () => {
  const showErrorToast = (message: string) => {
    toastManager.error("Error", message || "Failed to apply punishment. Please try again.");
  };

  return { showErrorToast };
};
