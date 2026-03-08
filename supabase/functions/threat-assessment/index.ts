import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { situation, location, timeOfDay, alone, language } = await req.json();
    if (!situation) throw new Error("Situation description is required");

    const systemPrompt = `You are a women's safety threat assessment AI. Analyze the user's situation and provide:

1. **Risk Level**: LOW / MODERATE / HIGH / CRITICAL (with a score 1-10)
2. **Threat Analysis**: What dangers are present
3. **Immediate Actions**: 3-5 things to do RIGHT NOW
4. **Precautions**: Preventive measures
5. **Emergency Protocol**: When to call for help

Be direct and actionable. If the situation sounds dangerous, be firm about calling 112.

Respond as a JSON object with these fields:
- "riskLevel": "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
- "riskScore": number (1-10)
- "threatAnalysis": string
- "immediateActions": string[] (3-5 items)
- "precautions": string[] (2-4 items)
- "emergencyProtocol": string
- "summary": string (1-2 sentence summary)

Return ONLY the JSON object, no other text. Write content in ${language === "hi" ? "Hindi" : "English"}.`;

    const userPrompt = `Situation: ${situation}
Location: ${location || "Not specified"}
Time: ${timeOfDay || "Not specified"}
Alone: ${alone ? "Yes" : "No / Not specified"}

Assess the threat level and provide safety guidance.`;

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
      return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let assessment;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      assessment = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse AI response:", content);
      assessment = { riskLevel: "UNKNOWN", summary: content };
    }

    return new Response(JSON.stringify({ assessment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("threat-assessment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
