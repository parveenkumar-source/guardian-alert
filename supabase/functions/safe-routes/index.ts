import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { origin, destination, timeOfDay } = await req.json();
    if (!origin || !destination) throw new Error("Origin and destination are required");

    const systemPrompt = `You are a women's safety route advisor for the Raksha safety app in India. Given an origin and destination, suggest 3 safe route options. For each route:

1. Give it a name (e.g., "Main Road Route", "Market Area Route")
2. Rate safety from 1-5 (5 = safest)
3. Estimate travel time
4. List 2-3 safety highlights (e.g., well-lit, CCTV coverage, populated area, police station nearby)
5. List any cautions (e.g., isolated stretch, poor lighting after 9pm)
6. Suggest the mode of transport (walking, auto, cab, metro)

Consider the time of day for safety ratings. Night routes should prefer main roads and public transport.

Return ONLY a JSON array with objects having these fields:
- "name": string
- "safetyRating": number (1-5)
- "estimatedTime": string
- "transportMode": string
- "highlights": string[] (safety positives)
- "cautions": string[] (safety concerns, can be empty)
- "description": string (1-2 sentence route summary)`;

    const userPrompt = `Origin: ${origin}
Destination: ${destination}
Time: ${timeOfDay}

Suggest 3 safe routes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let routes;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      routes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse AI response:", content);
      routes = [];
    }

    return new Response(JSON.stringify({ routes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("safe-routes error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
