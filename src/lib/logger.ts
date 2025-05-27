
const isDevelopment = import.meta.env.DEV;

/**
 * A simple logger utility that logs messages only in development mode.
 * This helps keep the production console clean and avoids leaking sensitive information.
 */
export const logger = {
  /**
   * Logs messages with a [DEBUG] prefix in development.
   * Use for detailed debugging information.
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },
  /**
   * Logs messages with an [INFO] prefix in development.
   * Use for general informational messages.
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  /**
   * Logs messages with a [WARN] prefix in development.
   * Use for warnings that don't necessarily halt execution.
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  /**
   * Logs messages with an [ERROR] prefix in development.
   * Use for errors that have been caught or are being reported.
   */
  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
  },
  /**
   * A generic log method, similar to console.log, active only in development.
   * Use for general logging where a specific level (debug, info) isn't necessary.
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
};

