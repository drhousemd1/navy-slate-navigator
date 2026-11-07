// Retired unsafe account-reset endpoint. Keep disabled and excluded from release.
// Local retirement does not establish or change any deployed function's behavior.
Deno.serve(() => Response.json({ error: 'This account-reset endpoint is retired.' }, {
  status: 410, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
}));
