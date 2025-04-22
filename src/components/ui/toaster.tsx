
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <SonnerToaster position="top-right" />
  )
}
