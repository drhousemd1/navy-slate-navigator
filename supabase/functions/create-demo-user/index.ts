
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
    
    // Admin user credentials - create this user if it doesn't exist
    const adminEmail = 'towenhall@gmail.com';
    const adminPassword = 'LocaMocha2025!';

    // First check if the users exist by trying to sign them in
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      throw new Error(`Failed to check existing users: ${listError.message}`);
    }
    
    // Check if users exist in the list
    const demoUserExists = existingUsers.users.some(user => user.email === demoEmail);
    const adminUserExists = existingUsers.users.some(user => user.email === adminEmail);
    
    console.log('User check - Demo user exists:', demoUserExists);
    console.log('User check - Admin user exists:', adminUserExists);
    
    // Create both users if they don't exist
    let demoCreated = false;
    let adminCreated = false;
    
    // Create demo user if needed
    if (!demoUserExists) {
      console.log('Creating demo user...');
      
      const { data: demoData, error: demoError } = await supabase.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { role: 'user' }
      });

      if (demoError) {
        console.error('Error creating demo user:', demoError);
      } else {
        console.log('Demo user created successfully:', demoData.user.id);
        demoCreated = true;
      }
    }
    
    // Create admin user if needed
    if (!adminUserExists) {
      console.log('Creating admin user...');
      
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });

      if (adminError) {
        console.error('Error creating admin user:', adminError);
      } else {
        console.log('Admin user created successfully:', adminData.user.id);
        adminCreated = true;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Users prepared successfully',
        demoUserExists: demoUserExists || demoCreated,
        adminUserExists: adminUserExists || adminCreated,
        credentials: { 
          demo: { email: demoEmail, password: demoPassword },
          admin: { email: adminEmail, password: adminPassword }
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
