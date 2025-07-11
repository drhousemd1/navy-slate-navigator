
import { useToast } from "@/hooks/use-toast";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <SonnerToaster 
      position="top-center"
      toastOptions={{
        duration: 2000,
        className: "w-full max-w-none rounded-none shadow-none border-none bg-background/95 text-foreground text-xs py-2 px-4 m-0",
        descriptionClassName: "hidden",
      }}
      closeButton={false}
      richColors={false}
      expand={false}
      offset={0}
      gap={0}
    />
  );
}
