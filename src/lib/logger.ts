
const isDevelopment = import.meta.env.DEV;

/**
 * A simple logger utility that logs messages only in development mode.
 * All development logs are routed through console.debug to centralize console output
 * and avoid direct use of console.log, console.warn, console.error in application code.
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
   * Logs messages with an [INFO] prefix in development (via console.debug).
   * Use for general informational messages.
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('[INFO]', ...args);
    }
  },
  /**
   * Logs messages with a [WARN] prefix in development (via console.debug).
   * Use for warnings that don't necessarily halt execution.
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('[WARN]', ...args);
    }
  },
  /**
   * Logs messages with an [ERROR] prefix in development (via console.debug).
   * Use for errors that have been caught or are being reported.
   */
  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('[ERROR]', ...args);
    }
  },
  /**
   * A generic log method, logs with a [LOG] prefix in development (via console.debug).
   * Use for general logging where a specific level (debug, info) isn't necessary.
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('[LOG]', ...args);
    }
  },
};

