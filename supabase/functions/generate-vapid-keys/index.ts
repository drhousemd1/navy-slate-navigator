// Retired insecure caller-driven endpoint. Deployment must accompany the new
// authenticated dispatcher; this route never sends, schedules, or generates keys.
Deno.serve(() => Response.json({ error: 'This notification endpoint is retired.' }, {
  status: 410, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
}));
