
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import { useToast } from "@/hooks/use-toast";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <SonnerToaster 
      position="top-center"
      toastOptions={{
        duration: 2000, // Reduced duration for less intrusion
        className: "shadow-none border-none bg-background/80 text-foreground text-sm single-line-toast",
        descriptionClassName: "text-muted-foreground text-xs hidden", // Hide description for single line
      }}
      closeButton={false} // Remove close button for cleaner look
      richColors
    />
  );
}
