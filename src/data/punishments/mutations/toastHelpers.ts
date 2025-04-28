
import { toast } from "@/hooks/use-toast";

/**
 * Helper for showing consistent toasts across mutations
 */
export const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
  toast({
    title,
    description,
    variant,
  });
};
