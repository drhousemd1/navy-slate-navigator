import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating new VAPID keys...');

    // Generate P-256 ECDSA key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );

    // Export public key in uncompressed format (required by Apple)
    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(publicKeyRaw);
    console.log(`Public key length: ${publicKeyBytes.length} bytes`);
    
    // Export private key 
    const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyRaw);
    console.log(`Private key length: ${privateKeyBytes.length} bytes`);

    // Convert to base64url (without padding)
    const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log('VAPID keys generated successfully');
    console.log(`Public key (base64url): ${publicKeyBase64.substring(0, 20)}...`);
    console.log(`Private key (base64url): ${privateKeyBase64.substring(0, 20)}...`);

    return new Response(
      JSON.stringify({ 
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
        format: 'base64url',
        publicKeyLength: publicKeyBytes.length,
        privateKeyLength: privateKeyBytes.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate VAPID keys', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});