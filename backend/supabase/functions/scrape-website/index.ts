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

    const { configId } = requestBody;
    
    if (!configId) {
      return new Response(
        JSON.stringify({ error: 'Config ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get scraping config
    const { data: config, error: configError } = await supabase
      .from('scraping_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError) throw configError;

    console.log('Scraping URL:', config.url);

    // Check if config is active
    if (!config.is_active) {
      return new Response(
        JSON.stringify({ error: 'Scraping config is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the webpage with timeout and error handling
    let response;
    let html;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      response = await fetch(config.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      html = await response.text();
      
      if (!html || html.length === 0) {
        throw new Error('Empty response from URL');
      }
    } catch (fetchError) {
      console.error('Error fetching webpage:', fetchError);
      let errorMessage = 'Failed to fetch webpage';
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          errorMessage = 'Request timeout: The website took too long to respond';
        } else {
          errorMessage = `Failed to fetch webpage: ${fetchError.message}`;
        }
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic extraction using regex patterns from extraction_rules
    const extractedData: any = {};
    const rules = config.extraction_rules as any;

    if (!rules || typeof rules !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid extraction rules configuration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const [key, pattern] of Object.entries(rules)) {
      try {
        if (!pattern || typeof pattern !== 'string') {
          console.warn(`Skipping invalid pattern for key: ${key}`);
          continue;
        }

        const regex = new RegExp(pattern as string, 'g');
      const match = html.match(regex);
      if (match) {
          // Extract the first capture group if available, otherwise use the full match
          const fullMatch = match[0];
          const captureGroupMatch = fullMatch.match(new RegExp(pattern as string));
          extractedData[key] = captureGroupMatch && captureGroupMatch[1] ? captureGroupMatch[1].trim() : fullMatch.trim();
        } else {
          console.warn(`No match found for pattern: ${key}`);
        }
      } catch (regexError) {
        console.error(`Error processing regex for key ${key}:`, regexError);
        // Continue with other patterns even if one fails
      }
    }

    console.log('Extracted data:', extractedData);

    // If portal_id is set, try to create a transaction
    let transactionCreated = false;
    if (config.portal_id && extractedData.amount) {
      // Clean amount string (remove currency symbols, commas, etc.)
      const amountStr = String(extractedData.amount).replace(/[₹,$,\s]/g, '');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount) && amount > 0) {
        // Get portal to calculate commission and site fee
        const { data: portal } = await supabase
          .from('portals')
          .select('default_commission_rate, default_site_fee')
          .eq('id', config.portal_id)
          .single();

        const commissionRate = portal?.default_commission_rate || 0;
        const siteFee = portal?.default_site_fee || 0;
        const commission = (amount * commissionRate) / 100;

        const { data: newTransaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: config.user_id,
            portal_id: config.portal_id,
            amount: amount,
            commission: commission,
            site_fee: siteFee,
            transaction_type: (extractedData.type || 'withdrawal').toLowerCase(),
            reference_number: extractedData.reference || `SCRAPED-${Date.now()}`,
            notes: `Auto-scraped from ${config.name} on ${new Date().toISOString()}`,
            status: 'completed'
          })
          .select()
          .single();

        if (txError) {
          console.error('Failed to create transaction:', txError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to create transaction: ${txError.message}`,
              data: extractedData 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        transactionCreated = true;
        console.log('Transaction created successfully:', newTransaction?.id);
      } else {
        console.warn('Invalid amount extracted:', extractedData.amount);
      }
    }

    // Update last scraped time
    await supabase
      .from('scraping_configs')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', configId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        message: transactionCreated 
          ? 'Website scraped successfully and transaction created' 
          : 'Website scraped successfully',
        transactionCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-website function:', error);
    
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('Supabase environment variables not configured')) {
        errorMessage = 'Supabase environment variables are not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.';
        statusCode = 500;
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: Deno.env.get('ENVIRONMENT') === 'development' && error instanceof Error ? error.stack : undefined
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
