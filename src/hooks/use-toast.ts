
// This is from shadcn/ui
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

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

// Re-export useToast from our custom implementation
export { useToast } from "./useToast";
