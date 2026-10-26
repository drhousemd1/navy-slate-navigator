
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-center"
      toastOptions={{
        duration: 2000,
        className: "w-full max-w-none rounded-none shadow-none border-none bg-background/95 text-foreground text-xs py-2 px-4 m-0",
        descriptionClassName: "whitespace-normal break-words",
        classNames: { title: "whitespace-normal break-words", content: "min-w-0" },
      }}
      closeButton={false}
      richColors={false}
      expand={false}
      offset={16}
      gap={0}
    />
  );
}
