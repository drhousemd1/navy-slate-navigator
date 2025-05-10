
"use client";

import { ReactNode } from "react";
import { Toaster } from "sonner";
import { toast as sonnerToast, type ToastT } from "sonner";

type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

// Centralized toast function with consistent configuration
const toast = ({ title, description, action, variant }: ToastProps) => {
  sonnerToast(title as string, {
    description, 
    action,
    className: variant === "destructive" ? "destructive single-line-toast" : "single-line-toast",
    position: "top-center",
    duration: 2000, // Reduced duration
  });
};

export { toast };

// Add ToastProvider component
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Toaster />
      {children}
    </>
  );
};

export function useToast() {
  return {
    toast,
    toasts: [] as ToastT[],
  };
}
