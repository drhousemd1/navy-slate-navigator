import { AuthError as SupabaseAuthErrorOriginal, PostgrestError as PostgrestErrorOriginal } from '@supabase/supabase-js';

// Re-export Supabase types for easier import elsewhere
export type { SupabaseAuthErrorOriginal as SupabaseAuthError, PostgrestErrorOriginal as PostgrestError };

/**
 * Base interface for custom application errors.
 */
export interface AppError extends Error {
  code?: string; // For specific error codes, e.g., 'NETWORK_ERROR', 'VALIDATION_ERROR'
  context?: Record<string, unknown>; // Additional context for debugging
}

// Type Guards
export function isSupabaseAuthError(error: unknown): error is SupabaseAuthErrorOriginal {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as SupabaseAuthErrorOriginal).status === 'number' &&
    'message' in error &&
    typeof (error as SupabaseAuthErrorOriginal).message === 'string'
  );
}

export function isPostgrestError(error: unknown): error is PostgrestErrorOriginal {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error && typeof (error as PostgrestErrorOriginal).code === 'string' &&
    'message' in error && typeof (error as PostgrestErrorOriginal).message === 'string' &&
    'details' in error && typeof (error as PostgrestErrorOriginal).details === 'string' &&
    'hint' in error && 
    (typeof (error as PostgrestErrorOriginal).hint === 'string' || (error as PostgrestErrorOriginal).hint === null)
  );
}

export function isAppError(error: unknown): error is AppError {
  // Check if it's an instance of Error and has AppError specific properties
  return error instanceof Error && (('code' in error && typeof (error as AppError).code === 'string') || ('context' in error && typeof (error as AppError).context === 'object'));
}

/**
 * Creates an AppError instance.
 * @param message The error message.
 * @param code Optional error code.
 * @param context Optional additional context.
 * @returns An AppError object.
 */
export function createAppError(message: string, code?: string, context?: Record<string, unknown>): AppError {
  const error = new Error(message) as AppError;
  error.name = code || 'AppError'; // Set name to code or a generic 'AppError'
  if (code) error.code = code;
  if (context) error.context = context;
  return error;
}

/**
 * Represents a validation error, typically with field-specific messages.
 */
export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR';
  fieldErrors?: Record<string, string[]>;
}

export function isValidationError(error: unknown): error is ValidationError {
  return isAppError(error) && error.code === 'VALIDATION_ERROR';
}

/**
 * A union type representing errors commonly caught within the application.
 * It can be expanded as more specific error types are identified.
 */
export type CaughtError = SupabaseAuthErrorOriginal | PostgrestErrorOriginal | AppError | Error;

/**
 * Extracts a user-friendly message from a caught error.
 * @param error The error caught.
 * @returns A string representing the error message.
 */
export function getErrorMessage(error: unknown): string {
  if (isSupabaseAuthError(error) || isPostgrestError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
}
