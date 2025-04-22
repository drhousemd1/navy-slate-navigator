
import { toast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { Toaster as SonnerToaster } from "sonner";

// Instead of using shadcn/ui's original Toaster that expects toasts array, 
// we'll use sonner's Toaster component directly since our useToast doesn't provide toasts array
export function Toaster() {
  return <SonnerToaster />;
}
