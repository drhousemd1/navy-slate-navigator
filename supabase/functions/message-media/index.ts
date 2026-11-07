import { createMessageMediaHandler } from './handler.ts';
const required = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; };
Deno.serve(createMessageMediaHandler({ supabaseUrl: required('SUPABASE_URL'), anonKey: required('SUPABASE_ANON_KEY'), serviceKey: required('SUPABASE_SERVICE_ROLE_KEY') }));
