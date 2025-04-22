
import { toast } from '@/hooks/use-toast';

export const usePunishmentToast = () => {
  const showErrorToast = (message: string) => {
    toast({
      title: "Error",
      description: message || "Failed to apply punishment. Please try again.",
      variant: "destructive",
    });
  };

  return { showErrorToast };
};
