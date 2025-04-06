
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

console.log("Hello from create-demo-user function!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or service key is not set');
    }
    
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    // Demo user credentials
    const demoEmail = 'demo@example.com';
    const demoPassword = 'demo123456';

    // First check if the user already exists
    const { data: existingUser, error: lookupError } = await supabase.auth.admin.getUserByEmail(demoEmail);

    // If the user doesn't exist, create them
    if (lookupError || !existingUser) {
      console.log('Demo user does not exist, creating...');
      
      // Create the user with the admin API
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { role: 'user' }
      });

      if (userError) {
        console.error('Error creating user:', userError);
        throw userError;
      }

      console.log('Demo user created successfully:', userData.user.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo user created successfully',
          userId: userData.user.id,
          credentials: { email: demoEmail, password: demoPassword }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Demo user already exists');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo user already exists',
          credentials: { email: demoEmail, password: demoPassword }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in create-demo-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'An error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
