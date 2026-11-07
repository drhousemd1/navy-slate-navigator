// Public configuration only. The private key is never read or returned here.
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Cache-Control': 'no-store' };
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET', 'POST'].includes(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  if (!publicKey || !/^[A-Za-z0-9_-]{87}$/.test(publicKey)) return Response.json({ error: 'Push is not configured' }, { status: 503, headers });
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(publicKey)));
  const keyId = [...digest].map(value => value.toString(16).padStart(2, '0')).join('');
  return Response.json({ publicKey, keyId }, { headers });
});
