
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * Central configuration for React Query.
 */

import { QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/react-query-config';

// Create a single, app-wide QueryClient instance
export const queryClient = createQueryClient();
