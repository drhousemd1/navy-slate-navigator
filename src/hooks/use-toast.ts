
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
const toast = ({ title, action, variant }: ToastProps) => {
  sonnerToast(title, {
    description: null,
    action,
    className: variant === "destructive" ? "destructive single-line-toast" : "single-line-toast",
    position: "top-center",
    duration: 2000,
  });
};

export { toast };

export function useToast() {
  return {
    toast,
    toasts: [] as ToastT[],
  };
}
