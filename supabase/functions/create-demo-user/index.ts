
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

    // Set credentials - DO NOT CREATE NEW USERS
    const adminEmail = 'towenhall@gmail.com';
    const adminPassword = 'LocaMocha2025!';
    const demoEmail = 'demo@example.com';
    const demoPassword = 'demo123456';

    // Check if admin user exists by listing users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error verifying users: ${listError.message}`
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Find admin user in the list
    const adminUser = users.users.find(user => user.email === adminEmail);
    let adminVerified = false;
    
    if (adminUser) {
      console.log(`Admin user found: ${adminUser.id}`);
      adminVerified = true;
      
      // Ensure the admin account is confirmed
      if (!adminUser.email_confirmed_at) {
        console.log('Admin email not confirmed, confirming now...');
        await supabase.auth.admin.updateUserById(
          adminUser.id,
          { email_confirmed: true }
        );
        console.log('Admin email confirmed successfully');
      }
    } else {
      console.error('Admin user not found in database');
      // We will NOT create the admin user as requested by the user
    }
    
    // Check if demo user exists
    const demoUser = users.users.find(user => user.email === demoEmail);
    let demoVerified = false;
    
    if (demoUser) {
      console.log(`Demo user found: ${demoUser.id}`);
      demoVerified = true;
      
      // Ensure demo email is confirmed
      if (!demoUser.email_confirmed_at) {
        await supabase.auth.admin.updateUserById(
          demoUser.id,
          { email_confirmed: true }
        );
      }
    }

    // Return the status info for frontend display
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User verification successful',
        adminVerified: adminVerified,
        demoVerified: demoVerified,
        credentials: { 
          admin: { email: adminEmail, password: adminPassword },
          demo: { email: demoEmail, password: demoPassword }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
