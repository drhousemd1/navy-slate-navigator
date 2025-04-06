
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
    
    // Check if admin user exists
    console.log("Checking if admin user exists with email:", adminEmail);
    
    // Use listUsers to find the admin user
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
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
    const adminUser = usersData.users.find(user => user.email === adminEmail);
    let adminVerified = false;
    
    // If admin user exists - attempt to force confirm email if needed
    if (adminUser) {
      console.log(`Admin user found: ${adminUser.id}`);
      adminVerified = true;
      
      // Ensure admin account is confirmed
      if (!adminUser.email_confirmed_at) {
        console.log('Admin email not confirmed, confirming now...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          { email_confirmed: true }
        );
        
        if (updateError) {
          console.error('Error confirming admin email:', updateError);
        } else {
          console.log('Admin email confirmed successfully');
        }
      }
      
      // Reset admin password to known value (helps when password is forgotten)
      console.log('Resetting admin password to known value...');
      const { error: resetError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: adminPassword }
      );
      
      if (resetError) {
        console.error('Error resetting admin password:', resetError);
      } else {
        console.log('Admin password reset successfully');
      }
    } else {
      // Create admin user since it doesn't exist yet
      console.log('Admin user not found, creating now...');
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true
      });
      
      if (createError) {
        console.error('Error creating admin user:', createError);
      } else {
        console.log('Admin user created successfully:', newAdmin?.user?.id);
        adminVerified = true;
      }
    }

    // Return the status info
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User verification successful',
        adminVerified: adminVerified,
        credentials: { 
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
