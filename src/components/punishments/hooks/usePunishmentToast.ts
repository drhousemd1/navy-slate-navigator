
import { toast } from "@/hooks/use-toast";

export const usePunishmentToast = () => {
  const showAppliedToast = (title: string, points: number) => {
    toast({
      title: "Punishment Applied",
      description: `"${title}" applied: -${points} points`,
      variant: "destructive",
    });
  };
  
  const showCreatedToast = (title: string) => {
    toast({
      title: "Punishment Created",
      description: `"${title}" was created successfully`,
    });
  };
  
  const showUpdatedToast = (title: string) => {
    toast({
      title: "Punishment Updated",
      description: `"${title}" was updated successfully`,
    });
  };
  
  const showDeletedToast = (title: string) => {
    toast({
      title: "Punishment Deleted",
      description: `"${title}" was deleted successfully`,
    });
  };
  
  const showErrorToast = (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };
  
  return {
    showAppliedToast,
    showCreatedToast,
    showUpdatedToast,
    showDeletedToast,
    showErrorToast
  };
};
