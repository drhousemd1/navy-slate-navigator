// Quick script to generate VAPID keys
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ronqvzihpffgowyscgfm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateVapidKeys() {
  try {
    console.log('Calling generate-vapid-keys function...');
    const { data, error } = await supabase.functions.invoke('generate-vapid-keys', {});
    
    if (error) {
      console.error('Error calling function:', error);
      return;
    }
    
    console.log('VAPID Keys Generated Successfully!');
    console.log('=====================================');
    console.log('Public Key:', data.publicKey);
    console.log('Private Key:', data.privateKey);
    console.log('=====================================');
    console.log('Format:', data.format);
    console.log('Public Key Length:', data.publicKeyLength);
    console.log('Private Key Length:', data.privateKeyLength);
    
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

generateVapidKeys();