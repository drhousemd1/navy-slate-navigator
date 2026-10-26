import { parseArgs } from 'node:util';
import { build, createServer, loadEnv } from 'vite';
import { resolveSupabaseConfiguration } from '../src/integrations/supabase/configuration.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { check: { type: 'boolean' }, build: { type: 'boolean' }, port: { type: 'string', default: '5173' } },
});
const target = positionals[0];
if (!['local', 'staging'].includes(target) || positionals.length !== 1) {
  console.error('Usage: node scripts/local-development.mjs local|staging [--check] [--build] [--port 5173]');
  process.exit(1);
}
const mode = target === 'local' ? 'development' : 'staging';
let server;
try {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  if (environment.VITE_BACKEND_TARGET !== target) {
    throw new Error(`Set VITE_BACKEND_TARGET=${target} in .env.${mode}.local. See scripts/local-development.md.`);
  }
  const configuration = resolveSupabaseConfiguration(environment, '127.0.0.1');
  console.log(`Using ${target} backend: ${configuration.url}`);
  if (!values.check) {
    if (values.build) {
      await build({ mode });
    } else {
      const port = Number(values.port);
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a port between 1024 and 65535.');
      server = await createServer({ mode, server: { host: '127.0.0.1', port, strictPort: true } });
      await server.listen();
      server.printUrls();
    }
  }
} catch (error) {
  await server?.close();
  console.error(error instanceof Error ? error.message : 'Local development setup failed.');
  process.exitCode = 1;
}
