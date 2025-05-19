
import { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds default timeout

/**
 * Wraps a Supabase query with a timeout to prevent hanging
 * @param queryFunction - Function that returns a Promise with the Supabase query result
 * @param timeoutMs - Timeout in milliseconds
 */
export async function withTimeout<T>(
  queryFunction: (signal: AbortSignal) => Promise<T>, 
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const result = await queryFunction(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Check if this was an abort error/timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new Error(`Database query timed out after ${timeoutMs}ms`);
      console.error('[withTimeout] Query timeout:', timeoutError);
      throw timeoutError;
    }
    
    throw error;
  }
}

/**
 * Enhanced Supabase select with timeout
 * @param supabase - Supabase client
 * @param table - Table name
 * @param options - Additional options like timeout
 */
export async function selectWithTimeout<T = any>(
  supabase: SupabaseClient,
  table: string,
  options: {
    columns?: string,
    eq?: [string, any],
    order?: [string, { ascending: boolean }],
    timeoutMs?: number
  } = {}
): Promise<{ data: T[] | null, error: any }> {
  const { columns = '*', eq, order, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  
  return withTimeout(async (signal) => {
    let query = supabase
      .from(table)
      .select(columns)
      .abortSignal(signal);
      
    if (eq) {
      query = query.eq(eq[0], eq[1]);
    }
    
    if (order) {
      query = query.order(order[0], order[1]);
    }
    
    return query;
  }, timeoutMs);
}
