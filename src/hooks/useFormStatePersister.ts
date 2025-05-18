
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { debounce } from 'lodash';

type FormValues = Record<string, any>;

interface PersisterOptions {
  exclude?: string[];  // Fields to exclude from persistence
  debounceMs?: number; // Debounce time in ms
}

const STORAGE_PREFIX = 'kingdom-app-form-';

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
        const values = JSON.parse(persistedState);
        
        // Only set values that are not excluded and not undefined
        Object.entries(values).forEach(([key, value]) => {
          if (!exclude.includes(key) && value !== undefined) {
            form.setValue(key as any, value);
          }
        });
        
        console.log(`[FormStatePersister] Loaded state for form: ${formId}`);
      }
    } catch (error) {
      console.error(`[FormStatePersister] Failed to load state for form: ${formId}`, error);
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
        console.log(`[FormStatePersister] Saved state for form: ${formId}`);
      } catch (error) {
        console.error(`[FormStatePersister] Failed to save state for form: ${formId}`, error);
      }
    }, debounceMs);
    
    const subscription = form.watch((values) => {
      saveState(values as T);
    });
    
    return () => {
      subscription.unsubscribe();
      saveState.cancel();
    };
  }, [form, exclude, formId, debounceMs, storageKey]);
  
  // Clear persisted state
  const clearPersistedState = async () => {
    try {
      localStorage.removeItem(storageKey);
      console.log(`[FormStatePersister] Cleared state for form: ${formId}`);
      return true;
    } catch (error) {
      console.error(`[FormStatePersister] Failed to clear state for form: ${formId}`, error);
      return false;
    }
  };
  
  return {
    clearPersistedState
  };
}
