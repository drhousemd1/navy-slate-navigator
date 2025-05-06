
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-center"
      toastOptions={{
        duration: 2000, // Reduced duration for less intrusion
        className: "shadow-none border-none bg-background/80 text-foreground text-sm single-line-toast",
        descriptionClassName: "text-muted-foreground text-xs", // Style for description
      }}
      closeButton={false} // Remove close button for cleaner look
      richColors
    />
  );
}
