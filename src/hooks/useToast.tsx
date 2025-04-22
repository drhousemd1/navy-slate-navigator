
import React from "react"
import { toast as sonnerToast, useToaster } from "sonner"

export interface ToastActionElement {
  altText: string;
  onClick: () => void;
  children: React.ReactNode;
}

export type ToastProps = React.ComponentPropsWithoutRef<typeof sonnerToast> & {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
}

export function useToast() {
  const { toasts } = useToaster()
  
  const toast = ({ 
    title, 
    description, 
    variant = "default", 
    ...props 
  }: ToastProps) => {
    return sonnerToast[variant === "destructive" ? "error" : "success"](
      title,
      {
        description,
        ...props,
      }
    )
  }

  return {
    toast,
    toasts,
    dismiss: sonnerToast.dismiss,
  }
}
