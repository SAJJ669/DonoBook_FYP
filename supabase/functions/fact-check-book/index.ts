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
    const { extractedData, lookupData } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if fact-checking is enabled
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'enable_fact_checking')
      .single();

    if (!settings || settings.setting_value === false) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: lookupData,
          message: 'Fact-checking disabled' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Performing fact-check on book metadata...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: "system",
            content: `You are a book metadata fact-checker. Compare the extracted data from images with the looked-up data from external sources. Verify accuracy of title, author, ISBN, publisher, publication year, and other metadata. Return a JSON object with: verified_data (corrected/merged data), discrepancies (list of differences), confidence_score (0-100), and recommendation ('use_extracted', 'use_lookup', or 'manual_review').`
          },
          {
            role: "user",
            content: `Compare these two data sources and fact-check:
            
Extracted from images:
${JSON.stringify(extractedData, null, 2)}

Looked up from external sources:
${JSON.stringify(lookupData, null, 2)}

Provide a fact-checked, merged result with confidence score.`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const factChecked = JSON.parse(aiData.choices[0].message.content);

    console.log('Fact-check complete:', factChecked);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: factChecked 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fact-checking book:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});