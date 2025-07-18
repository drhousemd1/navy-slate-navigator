
import { SupabaseClient, PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const DEFAULT_TIMEOUT_MS = 15000; // Increased from 8000 to 15 seconds

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
      logger.error('[withTimeout] Query timeout:', timeoutError);
      throw timeoutError;
    }
    
    throw error;
  }
}

/**
 * Enhanced Supabase select with timeout and proper user scoping
 * Now works with simplified RLS policies
 * @param supabase - Supabase client
 * @param table - Table name
 * @param options - Additional options like timeout
 */
export async function selectWithTimeout<RowType = any>( 
  supabase: SupabaseClient,
  table: string,
  options: {
    columns?: string,
    eq?: [string, any],
    order?: [string, { ascending: boolean }],
    single?: boolean,
    timeoutMs?: number,
    userId?: string // Still available but RLS handles filtering automatically now
  } = {}
): Promise<{ data: RowType[] | RowType | null, error: PostgrestError | null }> { 
  const { columns = '*', eq, order, single = false, timeoutMs = DEFAULT_TIMEOUT_MS, userId } = options;
  
  return withTimeout(async (signal) => {
    let queryBuilder = supabase
      .from(table)
      .select<string, RowType>(columns)
      .abortSignal(signal);
      
    // Only add explicit user filtering if specified (RLS now handles most cases automatically)
    if (userId && table !== 'encyclopedia_entries') {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }
      
    if (eq) {
      queryBuilder = queryBuilder.eq(eq[0], eq[1]);
    }
    
    if (order && !single) {
      queryBuilder = queryBuilder.order(order[0], { ascending: order[1].ascending });
    }
    
    let result;
    if (single) {
      result = await (queryBuilder.single() as unknown as Promise<PostgrestSingleResponse<RowType>>);
    } else {
      result = await (queryBuilder as unknown as Promise<PostgrestResponse<RowType>>);
    }

    return { 
      data: result.data,
      error: result.error 
    };
  }, timeoutMs);
}
