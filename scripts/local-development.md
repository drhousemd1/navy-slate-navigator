# Isolated frontend development

Use Node 22.18+ (Node 24 is the verified local runtime), then `npm ci --ignore-scripts`.
The existing `npm run dev`, production `npm run build`, and Lovable deployment remain available. Production configuration is accepted only at the four existing Lovable preview/published hostnames listed in `src/integrations/supabase/configuration.ts`. A new custom domain requires an explicit reviewed addition there. This guard prevents accidental development traffic; database authorization remains the security boundary.

For a separately provisioned staging Supabase project:

1. Copy `.env.staging.example` to `.env.staging.local`.
2. Set its URL and public publishable/anon key. Keep `VITE_BACKEND_TARGET=staging`.
3. Run `npm run check:staging`, then `npm run dev:staging`.

For a separately restored local Supabase instance:

1. Copy `.env.development.example` to `.env.development.local`.
2. Set its loopback URL and public key. Keep `VITE_BACKEND_TARGET=local`.
3. Run `npm run check:local`, then `npm run dev:local`.

Both launchers bind only to `127.0.0.1:5173` and stop when that port is occupied. Override with `-- --port 5174`. `npm run build:staging` builds with the staging environment after the same preflight. These commands do not provision a database or verify its schema, accounts or connectivity. Configuration checks do not make network requests.

Do not reuse production accounts or sessions for fixtures. Auth redirects must include the exact isolated app origin and `/reset-password` in the selected backend. Do not deploy the old `supabase/config.toml` to production: it does not capture the repaired live redirects. `VITE_*` variables become browser-visible; never put service-role keys, database passwords or function secrets in them. Existing `.env` contains only the already-public hosted connection; mode-specific `.local` files override it and are ignored by Git. Avoid global shell `VITE_*` variables, which take precedence over files.

## Database preparation is still required

There is no verified clean schema/restore recipe yet. Do **not** run `supabase db reset`, `db push`, or replay this repository's historical migrations as bootstrap: the first assumes existing core tables; later files delete records, drop tables and mutate Auth credentials. No local Supabase setup is supplied until current schema, functions, policies and selected data/media have been captured and tested in isolation. Preserve that history as evidence.

## Focused checks

`npm run test:config` checks production separation and invalid configuration without any backend. `npm run test:ui` runs component interaction tests under jsdom, also without a backend. Neither substitutes for real staged multi-account workflow and recovery tests.

References: [Vite environment loading](https://vite.dev/guide/env-and-mode), [Supabase local development](https://supabase.com/docs/guides/local-development/overview), [Supabase backups and Storage limits](https://supabase.com/docs/guides/platform/backups).
