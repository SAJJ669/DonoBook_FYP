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
    const { extractedData, isbn } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI settings
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['enable_web_lookup', 'preferred_sources', 'matching_threshold']);

    const settingsMap = settings?.reduce((acc: any, s: any) => {
      acc[s.setting_key] = s.setting_value;
      return acc;
    }, {}) || {};

    const webLookupEnabled = settingsMap.enable_web_lookup === true;
    const matchingThreshold = parseFloat(settingsMap.matching_threshold || '98');

    if (!webLookupEnabled) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: null,
          message: 'Web lookup disabled' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    if (isbn) {
      const { data: cached } = await supabase
        .from('book_metadata')
        .select('*')
        .eq('isbn', isbn)
        .single();

      if (cached) {
        console.log('Found cached metadata for ISBN:', isbn);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: cached,
            cached: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Use Lovable AI to search for book metadata
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const searchQuery = isbn 
      ? `Find detailed book metadata for ISBN: ${isbn}`
      : `Find detailed book metadata for: ${extractedData.title} by ${extractedData.author}`;

    console.log('Searching for book metadata:', searchQuery);

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
            content: `You are a book metadata lookup expert. Search for accurate book information and return comprehensive metadata as JSON. Include: title, author, isbn, publisher, publication_year, edition, page_count, dimensions (in cm), subjects, description. Calculate a confidence_score (0-100) based on match accuracy.`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const lookupData = JSON.parse(aiData.choices[0].message.content);

    // Calculate matching score
    let matchScore = lookupData.confidence_score || 0;
    
    if (matchScore >= matchingThreshold) {
      // Store in cache
      const { data: newMetadata, error } = await supabase
        .from('book_metadata')
        .insert([{
          ...lookupData,
          metadata_source: 'ai_lookup',
          confidence_score: matchScore
        }])
        .select()
        .single();

      if (error) {
        console.error('Error caching metadata:', error);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: newMetadata || lookupData,
          matchScore 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Match confidence ${matchScore}% is below threshold ${matchingThreshold}%`,
          data: lookupData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error looking up book metadata:', error);
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