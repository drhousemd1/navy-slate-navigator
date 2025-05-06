
"use client";

import { ReactNode } from "react";
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
    className: variant === "destructive" ? "destructive" : "",
    position: "top-center", // Changed from top-right to top-center
    duration: 3000, // Keeping the reasonable duration
  });
};

export { toast };

export function useToast() {
  return {
    toast,
    toasts: [] as ToastT[],
  };
}
