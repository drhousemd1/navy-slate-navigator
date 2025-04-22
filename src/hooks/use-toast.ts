
// This is from shadcn/ui
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export function toast({ title, description, variant, duration }: ToastProps) {
  return sonnerToast[variant === "destructive" ? "error" : "success"](
    title,
    {
      description,
      duration: duration || 5000,
    }
  )
}

export { toast }
