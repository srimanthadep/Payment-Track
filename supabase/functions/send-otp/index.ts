import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phoneNumber } = requestBody;
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database (expires in 10 minutes)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured. Please set PROJECT_URL and SERVICE_ROLE_KEY (or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) in your Edge Function secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: phoneNumber,
        otp_code: otpCode,
        expires_at: expiresAt
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Send OTP via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    // Check if Twilio is configured
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Please set environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and optionally TWILIO_PHONE_NUMBER and TWILIO_WHATSAPP_NUMBER');
    }

    // For development/testing: if no phone number is configured, just log the OTP
    if (!twilioPhone) {
      console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otpCode}`);
      console.log('⚠️ Twilio phone number not configured. OTP logged to console for development.');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP generated (DEV MODE - check server logs)',
          devMode: true,
          otp: otpCode // Only in dev mode
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `Your verification code is: ${otpCode}. Valid for 10 minutes.`;
    
    const fromNumber = twilioPhone || '';
    const toNumber = phoneNumber;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = btoa(`${accountSid}:${authToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json().catch(() => ({ message: await twilioResponse.text() }));
      console.error('Twilio error response:', errorData);
      
      let errorMessage = 'Failed to send OTP via Twilio';
      if (errorData.message) {
        errorMessage += `: ${errorData.message}`;
      } else if (errorData.error) {
        errorMessage += `: ${errorData.error}`;
      }
      
      throw new Error(errorMessage);
    }

    const twilioData = await twilioResponse.json();
    console.log('OTP sent successfully via SMS. Message SID:', twilioData.sid);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-otp function:', error);
    
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide more helpful error messages
      if (errorMessage.includes('Supabase environment variables not configured')) {
        errorMessage = 'Supabase environment variables are not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.';
        statusCode = 500;
      } else if (errorMessage.includes('Twilio credentials not configured')) {
        errorMessage = 'Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables in your Supabase project settings.';
        statusCode = 500;
      } else if (errorMessage.includes('Database error')) {
        errorMessage = `Database error: ${errorMessage}`;
        statusCode = 500;
      } else if (errorMessage.includes('Failed to send OTP')) {
        errorMessage = 'Failed to send OTP via Twilio. Please check your Twilio account credentials and phone number format.';
        statusCode = 500;
      }
    }

    // Don't expose stack trace in production
    const responseBody: any = { error: errorMessage };
    
    // Only include details in development (you can check for a dev flag)
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      responseBody.details = error instanceof Error ? error.stack : String(error);
    }

    return new Response(
      JSON.stringify(responseBody),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
