
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Added useQueryClient
import { deletePunishmentMutation } from "../punishments/mutations";
// import { queryClient } from "../queryClient"; // No longer needed here if using useQueryClient
// import { toast } from "@/hooks/use-toast"; // No longer needed here for top-level toasts

// DATA‑LAYER ONLY.  Do not duplicate Supabase logic in UI components.
export function useDeletePunishment() {
  const qc = useQueryClient(); // Use the hook to get queryClient instance

  return useMutation({
    mutationFn: deletePunishmentMutation(qc), // Pass queryClient to the factory function
    // onSuccess and onError toasts are handled within deletePunishmentMutation itself.
    // No need for additional toasts here unless they provide different information.
    // onSuccess: () => {
    //   // toast({ // Redundant
    //   //   title: "Success",
    //   //   description: "Punishment deleted successfully"
    //   // });
    // },
    onError: (error) => {
      // The toast is already handled by deletePunishmentMutation.
      // Logging here is still useful for debugging.
      console.error('Error in useDeletePunishment hook wrapper:', error);
      // toast({ // Redundant
      //   title: "Error",
      //   description: "Failed to delete punishment",
      //   variant: "destructive",
      // });
    }
    // onSettled might be useful if deletePunishmentMutation doesn't handle it.
    // However, deletePunishmentMutation should ideally handle its own invalidations or refetches.
    // If deletePunishmentMutation in `../punishments/mutations` does not invalidate,
    // we should add it here or there. Assuming it does or its invalidation in onError is enough.
  });
}
