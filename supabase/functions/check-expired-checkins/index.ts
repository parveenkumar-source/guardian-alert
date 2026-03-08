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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Find all expired, active, un-alerted check-ins
    const { data: expired, error } = await supabase
      .from("safety_checkins")
      .select("*")
      .eq("is_active", true)
      .eq("alert_sent", false)
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ message: "No expired check-ins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const checkin of expired) {
      // Fetch user's emergency contacts using service role
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("name, phone")
        .eq("user_id", checkin.user_id);

      if (!contacts || contacts.length === 0) {
        // Mark as sent even if no contacts to prevent repeat processing
        await supabase
          .from("safety_checkins")
          .update({ alert_sent: true, is_active: false })
          .eq("id", checkin.id);
        continue;
      }

      // Build alert message
      let message = `🚨 SAFETY CHECK-IN ALERT!\n\nThis person did not check in on time and may need help.`;
      if (checkin.latitude && checkin.longitude) {
        message += `\n\n📍 Last known location: https://www.google.com/maps?q=${checkin.latitude},${checkin.longitude}`;
      }
      message += `\n\nTimestamp: ${new Date().toLocaleString()}`;

      // Send SMS to each contact via TextBelt
      const smsResults = await Promise.allSettled(
        contacts.map(async (contact: any) => {
          const res = await fetch("https://textbelt.com/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: contact.phone,
              message,
              key: "textbelt",
            }),
          });
          return res.json();
        })
      );

      // Send push notification
      try {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", checkin.user_id);

        if (subs && subs.length > 0) {
          // Trigger push via the push-notifications function
          await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: "send",
              user_id: checkin.user_id,
              title: "⚠️ Check-in Expired",
              message: "You missed your safety check-in. Alerts have been sent to your contacts.",
            }),
          });
        }
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }

      // Log to activity_logs
      await supabase.from("activity_logs").insert({
        user_id: checkin.user_id,
        trigger_type: "checkin_expired",
        latitude: checkin.latitude,
        longitude: checkin.longitude,
        message: "Safety check-in expired — automatic alert sent",
      });

      // Mark check-in as processed
      await supabase
        .from("safety_checkins")
        .update({ alert_sent: true, is_active: false })
        .eq("id", checkin.id);

      results.push({ checkin_id: checkin.id, contacts_notified: contacts.length });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-expired error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
