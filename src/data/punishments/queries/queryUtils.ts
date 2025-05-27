
/**
 * Common utility functions for queries
 */
import { logger } from '@/lib/logger'; // Added logger import

export const logQueryPerformance = (
  operationName: string, 
  startTime: number, 
  dataLength?: number
) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logger.log( // Replaced console.log
    `[${operationName}] Operation completed in ${duration.toFixed(2)}ms` + 
    (dataLength !== undefined ? `, retrieved ${dataLength} items` : '')
  );
};

