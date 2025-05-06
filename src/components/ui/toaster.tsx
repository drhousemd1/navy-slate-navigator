
import { useToast } from "@/hooks/use-toast";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <SonnerToaster 
      position="top-center"
      toastOptions={{
        duration: 3000,
        className: "shadow-lg border-border bg-background text-foreground max-w-full w-full single-line-toast",
        descriptionClassName: "text-muted-foreground text-sm",
      }}
      closeButton
      richColors
    />
  );
}
