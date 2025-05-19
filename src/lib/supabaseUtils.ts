
import { SupabaseClient, PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js'; // Added PostgrestResponse, PostgrestSingleResponse

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
export async function selectWithTimeout<RowType = any>( // Renamed T to RowType for clarity
  supabase: SupabaseClient,
  table: string,
  options: {
    columns?: string,
    eq?: [string, any],
    order?: [string, { ascending: boolean }],
    single?: boolean, // Added option to fetch a single record
    timeoutMs?: number
  } = {}
): Promise<{ data: RowType[] | RowType | null, error: PostgrestError | null }> { // Return type adjusted for single/multiple
  const { columns = '*', eq, order, single = false, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  
  // The queryFunction returns Promise<PostgrestResponse<RowType>> or Promise<PostgrestSingleResponse<RowType>>
  // So withTimeout is generic over that response type
  const supabaseResponse = await withTimeout<PostgrestResponse<RowType> | PostgrestSingleResponse<RowType>>(async (signal) => {
    let queryBuilder = supabase
      .from(table)
      .select<string, RowType>(columns) // Explicitly type the select output row
      .abortSignal(signal);
      
    if (eq) {
      queryBuilder = queryBuilder.eq(eq[0], eq[1]);
    }
    
    if (order && !single) { // order doesn't make sense with .single() which implies unique key
      queryBuilder = queryBuilder.order(order[0], order[1]);
    }
    
    if (single) {
      return queryBuilder.single();
    }
    return queryBuilder; // This is a PostgrestFilterBuilder, await happens in withTimeout
  }, timeoutMs);

  return { data: supabaseResponse.data, error: supabaseResponse.error };
}

