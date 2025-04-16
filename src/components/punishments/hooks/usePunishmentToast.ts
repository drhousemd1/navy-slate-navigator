
import { toast } from "@/hooks/use-toast";
import { useCallback } from "react";

export const usePunishmentToast = () => {
  const showAppliedToast = useCallback((title: string, points: number) => {
    toast({
      title: "Punishment Applied",
      description: `"${title}" applied: -${points} points`,
      variant: "destructive",
      duration: 3000
    });
  }, []);
  
  const showCreatedToast = useCallback((title: string) => {
    toast({
      title: "Punishment Created",
      description: `"${title}" was created successfully`,
      duration: 3000
    });
  }, []);
  
  const showUpdatedToast = useCallback((title: string) => {
    toast({
      title: "Punishment Updated",
      description: `"${title}" was updated successfully`,
      duration: 3000
    });
  }, []);
  
  const showDeletedToast = useCallback((title: string) => {
    toast({
      title: "Punishment Deleted",
      description: `"${title}" was deleted successfully`,
      duration: 3000
    });
  }, []);
  
  const showErrorToast = useCallback((message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
      duration: 4000
    });
  }, []);
  
  return {
    showAppliedToast,
    showCreatedToast,
    showUpdatedToast,
    showDeletedToast,
    showErrorToast
  };
};
