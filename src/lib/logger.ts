
const isDev = import.meta.env.MODE === 'development';

export const logger = {
  debug: (...a: any[]) => { if (isDev) console.debug(...a); },
  info:  (...a: any[]) => { if (isDev) console.info (...a); },
  warn:  (...a: any[]) => { if (isDev) console.warn (...a); },
  error: (...a: any[]) => {
    const redact = (o: any) =>
      typeof o === 'object' && o !== null
        ? JSON.parse(JSON.stringify(o, (k, v) =>
            ['email','token','password','partner_code'].includes(k) ? '[REDACTED]' : v))
        : o;
    // Always log errors, even in production, but ensure they are redacted.
    // The console.* calls inside logger are the ONLY ones allowed.
    console.error(...a.map(redact));
  }
};
