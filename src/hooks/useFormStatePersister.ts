
import { useEffect } from 'react';
import { UseFormReturn, FieldPathValue, Path, PathValue } from 'react-hook-form'; // Import PathValue
import { debounce } from 'lodash';
import { logger } from '@/lib/logger'; // Added logger import

type FormValues = Record<string, any>;

interface PersisterOptions {
  exclude?: string[];  // Fields to exclude from persistence
  debounceMs?: number; // Debounce time in ms
}

export const STORAGE_PREFIX = 'kingdom-app-form-'; // Export this

/**
 * Hook to persist form state in localStorage
 * @param formId - Unique identifier for the form
 * @param form - React Hook Form instance
 * @param options - Options for persistence
 * @returns Methods to manage persisted form state
 */
export function useFormStatePersister<T extends FormValues>(
  formId: string,
  form: UseFormReturn<T>,
  options: PersisterOptions = {}
) {
  const { exclude = [], debounceMs = 500 } = options;
  const storageKey = `${STORAGE_PREFIX}${formId}`;
  
  // Load persisted state on mount
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem(storageKey);
      if (persistedState) {
        const values = JSON.parse(persistedState) as Partial<T>; // Type assertion for parsed values
        
        // Only set values that are not excluded and not undefined
        Object.entries(values).forEach(([key, value]) => {
          if (!exclude.includes(key) && value !== undefined) {
            // Ensure key is a valid path and value matches expected type for that path
            // Explicitly cast value to PathValue<T, Path<T>> which is equivalent to FieldPathValue
            form.setValue(key as Path<T>, value as PathValue<T, Path<T>>);
          }
        });
        
        logger.debug(`[FormStatePersister] Loaded state for form: ${formId}`);
      }
    } catch (error) {
      logger.error(`[FormStatePersister] Failed to load state for form: ${formId}`, error);
    }
  }, [formId, form, exclude, storageKey]);
  
  // Save form state on change
  useEffect(() => {
    const saveState = debounce((values: T) => {
      try {
        // Filter out excluded fields
        const filteredValues = Object.entries(values).reduce((acc, [key, value]) => {
          if (!exclude.includes(key)) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);
        
        localStorage.setItem(storageKey, JSON.stringify(filteredValues));
        logger.debug(`[FormStatePersister] Saved state for form: ${formId}`);
      } catch (error) {
        logger.error(`[FormStatePersister] Failed to save state for form: ${formId}`, error);
      }
    }, debounceMs);
    
    const subscription = form.watch((values) => {
      saveState(values as T);
    });
    
    return () => {
      subscription.unsubscribe();
      saveState.cancel(); // Ensure debounce is cancelled on unmount
    };
  }, [form, exclude, formId, debounceMs, storageKey]);
  
  // Clear persisted state
  const clearPersistedState = async (): Promise<boolean> => {
    try {
      localStorage.removeItem(storageKey);
      logger.debug(`[FormStatePersister] Cleared state for form: ${formId}`);
      return true;
    } catch (error) {
      logger.error(`[FormStatePersister] Failed to clear state for form: ${formId}`, error);
      return false;
    }
  };
  
  return {
    clearPersistedState
  };
}

