
// This is from shadcn/ui
import { toast as sonnerToast } from "sonner";
import { useToast } from "./useToast";
import type { ToastProps } from "./useToast";

// Create a single toast function that exports correctly
export function toast({ title, description, variant, duration }: ToastProps) {
  return sonnerToast[variant === "destructive" ? "error" : "success"](
    title,
    {
      description,
      duration: duration || 5000,
    }
  );
}

// Export both the hook and the standalone toast function
export { useToast };
export type { ToastProps };
