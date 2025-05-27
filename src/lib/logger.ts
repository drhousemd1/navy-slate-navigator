
const isDev = import.meta.env.MODE === 'development';

export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.info (...args); },
  warn:  (...args: unknown[]) => { if (isDev) console.warn (...args); },
  error: (...args: unknown[]) => {
    const redact = (o: unknown): unknown =>
      typeof o === 'object' && o !== null
        ? JSON.parse(JSON.stringify(o, (k, v) =>
            ['email','token','password','partner_code'].includes(k) ? '[REDACTED]' : v))
        : o;
    // Always log errors, even in production, but ensure they are redacted.
    // The console.* calls inside logger are the ONLY ones allowed.
    console.error(...args.map(redact));
  }
};

