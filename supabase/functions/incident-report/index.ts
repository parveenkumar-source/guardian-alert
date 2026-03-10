const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { description, incidentType, location, date, language } = await req.json();
    if (!description) throw new Error("Incident description is required");

    const systemPrompt = `You are a legal document assistant for women's safety. Generate a formal incident report / police complaint (FIR draft) based on the user's description.

The report should include:
1. **Subject/Title** of the complaint
2. **Date & Time** of incident
3. **Location** of incident
4. **Detailed Description** — expand the user's description into a formal narrative
5. **Type of Offense** — classify under relevant IPC/BNS sections if applicable
6. **Witnesses** — placeholder for witness details
7. **Evidence** — placeholder for any evidence
8. **Prayer/Request** — formal request for action

Write in ${language === "hi" ? "Hindi" : "English"}. Use formal legal language. Make it ready to print and submit to a police station.`;

    const userPrompt = `Incident Type: ${incidentType || "Not specified"}
Date: ${date || "Not specified"}
Location: ${location || "Not specified"}

Description: ${description}

Generate a formal police complaint / FIR draft.`;

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
    const report = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("incident-report error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
