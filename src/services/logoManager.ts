// One backend authority for shared branding; no account-local URL overrides or
// filesystem archive stubs. The public read and owner operations use the same API.
export { brandingTransport as logoManager } from '@/data/branding/api';
