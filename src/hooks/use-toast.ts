
// This is from shadcn/ui
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

// Create a single toast function that exports correctly
export function toast({ title, description, variant, duration }: ToastProps) {
  return sonnerToast[variant === "destructive" ? "error" : "success"](
    title,
    {
      description,
      duration: duration || 5000,
    }
  )
}

// Export a hook interface for compatibility with shadcn/ui pattern
export { useToast } from "./useToast"
