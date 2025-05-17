import { useEffect, useCallback } from 'react';
import localforage from 'localforage';
import debounce from 'lodash/debounce';
import { UseFormReturn, FieldValues } from 'react-hook-form';

const FORM_STATE_PREFIX = 'formStatePersister_';

interface UseFormStatePersisterOptions<TFieldValues extends FieldValues> {
  debounceTime?: number;
  exclude?: (keyof TFieldValues)[];
}

export function useFormStatePersister<TFieldValues extends FieldValues>(
  formId: string | null, // Pass null to disable persistence for this instance
  form: UseFormReturn<TFieldValues>,
  options?: UseFormStatePersisterOptions<TFieldValues>
) {
  const { watch, reset } = form;
  const debounceTime = options?.debounceTime ?? 500;
  const fieldsToExclude = options?.exclude ?? [];

  const uniqueStorageKey = formId ? `${FORM_STATE_PREFIX}${formId}` : null;

  // Load persisted state on mount or when formId changes
  useEffect(() => {
    if (!uniqueStorageKey) return;

    let isMounted = true;
    localforage.getItem(uniqueStorageKey)
      .then(persistedState => {
        if (isMounted && persistedState && typeof persistedState === 'object') {
          const stateToLoad = { ...persistedState };
          fieldsToExclude.forEach(key => {
            delete (stateToLoad as any)[key];
          });

          if (Object.keys(stateToLoad).length > 0) {
            // Reset with persisted data, try to keep existing default values for fields not in persistedState
            reset(stateToLoad as TFieldValues, { keepDefaultValues: true });
            console.log(`[FormPersister] Loaded state for ${uniqueStorageKey}:`, stateToLoad);
          }
        }
      })
      .catch(error => {
        console.error(`[FormPersister] Error loading state for ${uniqueStorageKey}:`, error);
      });

    return () => { isMounted = false; };
  }, [uniqueStorageKey, reset, fieldsToExclude]);


  // Save form state on changes
  const saveState = useCallback(debounce((data: TFieldValues) => {
    if (!uniqueStorageKey) return;

    const dataToSave = { ...data };
    fieldsToExclude.forEach(key => {
      delete (dataToSave as any)[key];
    });
    
    // Avoid saving if there's nothing to save after exclusion
    if (Object.keys(dataToSave).length === 0 && Object.keys(data).length > 0 && fieldsToExclude.length > 0) {
        // If all fields were excluded, but there was data, we might want to clear or do nothing.
        // For now, if effectively empty after exclusion, don't save.
        // Or, if you want to ensure it's empty in storage:
        // localforage.removeItem(uniqueStorageKey);
        return;
    }


    localforage.setItem(uniqueStorageKey, dataToSave)
      .then(() => {
        // console.log(`[FormPersister] Saved state for ${uniqueStorageKey}:`, dataToSave);
      })
      .catch(error => {
        console.error(`[FormPersister] Error saving state for ${uniqueStorageKey}:`, error);
      });
  }, debounceTime), [uniqueStorageKey, debounceTime, fieldsToExclude]);

  useEffect(() => {
    if (!uniqueStorageKey) return;

    const subscription = watch((value) => {
      saveState(value as TFieldValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveState, uniqueStorageKey]);

  const clearPersistedState = useCallback(async () => {
    if (!uniqueStorageKey) return;
    try {
      await localforage.removeItem(uniqueStorageKey);
      console.log(`[FormPersister] Cleared state for ${uniqueStorageKey}`);
    } catch (error) {
      console.error(`[FormPersister] Error clearing state for ${uniqueStorageKey}:`, error);
    }
  }, [uniqueStorageKey]);

  return { clearPersistedState };
}
