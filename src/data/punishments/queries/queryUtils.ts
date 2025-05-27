
import { logger } from '@/lib/logger';

/**
 * Common utility functions for queries
 */

export const logQueryPerformance = (
  operationName: string, 
  startTime: number, 
  dataLength?: number
) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logger.debug(
    `[${operationName}] Operation completed in ${duration.toFixed(2)}ms` + 
    (dataLength !== undefined ? `, retrieved ${dataLength} items` : '')
  );
};

