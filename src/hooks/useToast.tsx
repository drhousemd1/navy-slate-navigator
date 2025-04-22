
import React from "react";
import { toast as sonnerToast } from "sonner";

export interface ToastActionElement {
  altText: string;
  onClick: () => void;
  children: React.ReactNode;
}

export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  // Since sonner doesn't export useToaster, we need to use the toast API directly
  const toast = ({ 
    title, 
    description, 
    variant = "default", 
    duration = 5000,
    ...props 
  }: ToastProps) => {
    return sonnerToast[variant === "destructive" ? "error" : "success"](
      title,
      {
        description,
        duration,
        ...props,
      }
    );
  };

  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}
