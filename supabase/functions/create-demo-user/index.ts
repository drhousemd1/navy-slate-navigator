
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

    // Instead of creating users, just verify they exist
    const { data: adminData, error: adminError } = await supabase.auth.admin.getUserByEmail(adminEmail);
    
    if (adminError) {
      console.error('Error checking admin user:', adminError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error verifying admin user: ${adminError.message}`
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!adminData.user) {
      console.error('Admin user not found in database');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Admin user not found. Please contact support.'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log(`Admin user verified: ${adminData.user.id}`);
    
    // Ensure the admin account is confirmed
    if (!adminData.user.email_confirmed_at) {
      console.log('Admin email not confirmed, confirming now...');
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        adminData.user.id,
        { email_confirmed: true }
      );
      
      if (confirmError) {
        console.error('Error confirming admin email:', confirmError);
      } else {
        console.log('Admin email confirmed successfully');
      }
    }
    
    // Check if demo user exists (lower priority)
    const { data: demoData, error: demoError } = await supabase.auth.admin.getUserByEmail(demoEmail);
    let demoExists = false;
    
    if (!demoError && demoData.user) {
      demoExists = true;
      console.log(`Demo user exists: ${demoData.user.id}`);
      
      // Ensure demo email is confirmed
      if (!demoData.user.email_confirmed_at) {
        await supabase.auth.admin.updateUserById(
          demoData.user.id,
          { email_confirmed: true }
        );
      }
    }

    // Return the credentials info without creating new users
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User verification successful',
        adminVerified: !!adminData.user,
        demoVerified: demoExists,
        adminId: adminData.user?.id,
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
