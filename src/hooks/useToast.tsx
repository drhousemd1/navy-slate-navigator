
import React from "react";
import { toast as sonnerToast, type Toast as SonnerToast } from "sonner";

// Custom action element type for our toasts
export interface ToastActionElement {
  altText: string;
  onClick: () => void;
  children: React.ReactNode;
}

// Our custom toast props type
export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  // Create a toast function that adapts our props to sonner's expected format
  const toast = ({ 
    title, 
    description, 
    variant = "default", 
    duration = 5000,
    action,
    ...props 
  }: ToastProps) => {
    // Map our variant to sonner's types
    const type = variant === "destructive" ? "error" : "success";
    
    // Convert our custom action to sonner's expected format if it exists
    const sonnerAction = action ? {
      label: action.altText,
      onClick: action.onClick
    } : undefined;
    
    return sonnerToast[type](
      title,
      {
        description,
        duration,
        action: sonnerAction,
        ...props,
      }
    );
  };

  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}
