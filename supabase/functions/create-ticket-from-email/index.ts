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
    const { from, subject, text, html } = await req.json();

    if (!from || !subject || (!text && !html)) {
      return new Response(JSON.stringify({ error: 'Missing email data (from, subject, text/html).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const senderEmail = from.email || from; // Handle different 'from' formats
    const ticketSubject = subject;
    const ticketDescription = text || html; // Prefer plain text, fallback to HTML

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let createdByUserId: string | null = null;

    // 1. Try to find an existing user by email
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles_with_auth_emails')
      .select('id')
      .eq('email', senderEmail)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching sender profile:', profileError.message);
      // Continue, but createdByUserId will remain null
    } else if (existingProfile) {
      createdByUserId = existingProfile.id;
    }

    // 2. If sender not found, try to find an administrator to assign the ticket to
    if (!createdByUserId) {
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'administrator')
        .limit(1)
        .single();

      if (adminError) {
        console.error('Error fetching administrator profile as fallback:', adminError.message);
        return new Response(JSON.stringify({ error: 'Sender not found and no administrator available to assign ticket.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      createdByUserId = adminProfile.id;
      console.warn(`Sender email "${senderEmail}" not found. Ticket assigned to administrator: ${createdByUserId}`);
    }

    // 3. Insert the new ticket
    const { data: newTicket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        subject: ticketSubject,
        description: `Email from: ${senderEmail}\n\n${ticketDescription}`,
        status: 'open',
        priority: 'medium',
        created_by: createdByUserId,
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError.message);
      return new Response(JSON.stringify({ error: 'Failed to create ticket: ' + ticketError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Ticket created successfully!', ticket: newTicket }), {
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