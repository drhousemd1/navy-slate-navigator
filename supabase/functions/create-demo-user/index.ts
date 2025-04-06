
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
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1000 // Ensure we get enough users to find the admin
    });
    
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
    console.log(`Found ${usersData.users.length} users, searching for admin email: ${adminEmail}`);
    const adminUser = usersData.users.find(user => user.email === adminEmail);
    let adminVerified = false;

    if (adminUser) {
      console.log(`Admin user found with ID: ${adminUser.id}`);
      adminVerified = true;
      
      // Force update password regardless of current state
      console.log('Resetting admin password to ensure it is correct...');
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: adminPassword }
      );
      
      if (passwordError) {
        console.error('Error updating admin password:', passwordError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Error updating admin password: ${passwordError.message}`
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log('Admin password successfully reset');

      // Force email confirmation
      if (!adminUser.email_confirmed_at) {
        console.log('Admin email not confirmed, confirming now...');
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          { email_confirmed: true }
        );
        
        if (confirmError) {
          console.error('Error confirming admin email:', confirmError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Error confirming admin email: ${confirmError.message}`
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        console.log('Admin email confirmed successfully');
      } else {
        console.log('Admin email already confirmed');
      }
    } else {
      // If admin user doesn't exist, create it
      console.log('Admin user not found, creating now...');
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true
      });
      
      if (createError) {
        console.error('Error creating admin user:', createError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Error creating admin user: ${createError.message}`
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log('Admin user created successfully:', newAdmin?.user?.id);
      adminVerified = true;
    }

    // Verify the user one more time
    if (adminVerified) {
      console.log('Verifying admin user is ready for login...');
      const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(
        adminUser?.id || ''
      );
      
      if (verifyError) {
        console.error('Error verifying admin user:', verifyError);
      } else {
        console.log('Admin user verification:', 
          verifyData?.user ? 
          `User found, email confirmed: ${!!verifyData.user.email_confirmed_at}` : 
          'User not found'
        );
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
        message: error.message || 'An error occurred',
        stack: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
