
/**
 * Type helpers for fixing type issues in the codebase
 */

// Helper to ensure data from any() or TQueryFnData is treated as the expected type
export function ensureArray<T>(data: any): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [];
}

// Helper to ensure array length check is safe
export function safeArrayLength(arr: any): number {
  return Array.isArray(arr) ? arr.length : 0;
}

// Type guard to check if data is an array before mapping
export function isArrayWithMap<T>(data: any): data is T[] {
  return Array.isArray(data);
}
