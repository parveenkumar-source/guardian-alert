import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { message } = await req.json();
    if (!message) {
      throw new Error("Message is required");
    }

    // Fetch user's emergency contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("emergency_contacts")
      .select("name, phone")
      .eq("user_id", user.id);

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      throw new Error("No emergency contacts found");
    }

    // Send SMS to each contact via TextBelt (free, no API key needed)
    const results = await Promise.allSettled(
      contacts.map(async (contact) => {
        const res = await fetch("https://textbelt.com/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: contact.phone,
            message: message,
            key: "textbelt",
          }),
        });

        const data = await res.json();
        if (!data.success) {
          console.error(`Failed to send SMS to ${contact.phone}:`, data);
          return { contact: contact.name, success: false, error: data.error || data.message };
        }
        return { contact: contact.name, success: true, textId: data.textId };
      })
    );

    const summary = results.map((r, i) => {
      const base = r.status === "fulfilled" ? r.value : { success: false, error: r.reason?.message };
      return { ...base, contact: contacts[i].name };
    });

    return new Response(JSON.stringify({ success: true, results: summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-sms error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
