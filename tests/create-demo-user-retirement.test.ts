// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../supabase/functions/create-demo-user/index.ts', import.meta.url), 'utf8');
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const callers = ['anonymous', 'malformed', 'user', 'service'] as const;

it.each(methods.flatMap(method => callers.map(caller => ({ method, caller }))))(
  'the actual entrypoint is inert for $method from $caller', async ({ method, caller }) => {
    let handler: ((request: Request) => Response | Promise<Response>) | undefined;
    const forbidden = vi.fn(() => { throw new Error('Retired handler attempted an external capability'); });
    const serve = vi.fn((callback: typeof handler) => { handler = callback; });
    // No imports/module loader are available. Every Deno capability except
    // registering the real handler fails, including environment and filesystem.
    const Deno = new Proxy({}, { get: (_target, key) => key === 'serve' ? serve : forbidden() });
    vm.runInNewContext(source, {
      Deno, Response, fetch: forbidden, createClient: forbidden,
      WebSocket: forbidden, XMLHttpRequest: forbidden,
    }, { timeout: 1_000 });
    expect(serve).toHaveBeenCalledOnce();
    expect(handler).toBeTypeOf('function');
    const headers: Record<string, string> = {
      Origin: 'https://unrelated.example.invalid', 'Content-Type': 'application/json',
    };
    if (caller !== 'anonymous') {
      headers.Authorization = caller === 'malformed' ? 'not-a-bearer' : `Bearer synthetic-${caller}-credential`;
      headers.apikey = 'synthetic-publishable-key';
    }
    const request = new Request('https://backend.example.invalid/functions/v1/create-demo-user', {
      method, headers,
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: '{malformed JSON with synthetic-password' }),
    });
    const response = await handler!(request);
    expect(response.status).toBe(410);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.json()).toEqual({ error: 'This account-reset endpoint is retired.' });
    expect(request.bodyUsed).toBe(false);
    expect(forbidden).not.toHaveBeenCalled();
  },
);
