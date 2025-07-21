import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, first_name, last_name, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Email, password, and role are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create the user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: { first_name, last_name }, // Pass first/last name to user_metadata
    });

    if (userError) {
      console.error('Error creating user:', userError.message);
      return new Response(JSON.stringify({ error: userError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // The handle_new_user trigger should automatically create the profile.
    // We then update the profile role if it's not 'client' (default from trigger).
    // Also update first_name and last_name in case they were not set by the trigger
    // or need to be explicitly set for the profile.
    const { data: profileUpdateData, error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ role, first_name, last_name })
      .eq('id', userData.user.id)
      .select();

    if (profileUpdateError) {
      console.error('Error updating profile role:', profileUpdateError.message);
      // Return a non-200 status to indicate an error to the client
      return new Response(JSON.stringify({
        error: 'User created, but profile role update failed: ' + profileUpdateError.message,
        user: userData.user,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal Server Error for database update failure
      });
    }

    return new Response(JSON.stringify({ message: 'User and profile created successfully!', user: userData.user, profile: profileUpdateData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});