
import { useMutation } from "@tanstack/react-query";
import { deletePunishmentMutation } from "../punishments/mutations";
import { queryClient } from "../queryClient";
import { toast } from "@/hooks/use-toast";

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useDeletePunishment() {
  return useMutation({
    mutationFn: deletePunishmentMutation(queryClient),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment deleted successfully"
      });
    },
    onError: (error) => {
      console.error('Error in useDeletePunishment hook:', error);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive",
      });
    }
  });
}
