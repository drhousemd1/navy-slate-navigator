
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

console.log("Hello from create-demo-user function!")

serve(async (req) => {
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
    const { data: existingUsers, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', await getUserIdByEmail(supabase, demoEmail));

    // If the user doesn't exist, create them
    if (lookupError || !existingUsers || existingUsers.length === 0) {
      // Create the user with the admin API
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,  // Auto-confirm the email
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
          userId: userData.user.id 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Demo user already exists');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo user already exists'
        }),
        { headers: { 'Content-Type': 'application/json' } }
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
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to get user ID by email
async function getUserIdByEmail(supabase, email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return null;
    }
    
    const user = data.users.find(u => u.email === email);
    return user?.id || null;
  } catch (error) {
    console.error('Error in getUserIdByEmail:', error);
    return null;
  }
}
