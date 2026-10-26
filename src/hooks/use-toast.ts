
"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast, type ToastT } from "sonner";

type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

// Centralized toast function with consistent configuration
const toast = ({ title, description, action, variant }: ToastProps) => {
  sonnerToast(title, {
    description,
    action,
    className: variant === "destructive" ? "destructive" : undefined,
    position: "top-center",
    duration: variant === "destructive" ? 10000 : description ? 6000 : 2000,
    closeButton: true,
  });
};

export { toast };

export function useToast() {
  return {
    toast,
    toasts: [] as ToastT[],
  };
}
