import { supabase } from "@/integrations/supabase/client";
import { generateSOSMessage } from "@/lib/contacts";
import { sendViaEdgeFunction, sendViaNativeSMS, sendAllWhatsApp } from "@/lib/alertSender";
import { logSOSTrigger } from "@/lib/activityLog";

/**
 * Auto-sends emergency alerts when voice SOS is triggered.
 * Bypasses the countdown — immediately sends SMS + WhatsApp with live location.
 */
export async function triggerVoiceSOS(
  location: { latitude: number; longitude: number } | null
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, reason: "not_authenticated" };

  // Fetch contacts
  const { data: contacts, error } = await supabase
    .from("emergency_contacts")
    .select("name, phone")
    .eq("user_id", user.id);

  if (error || !contacts || contacts.length === 0) {
    return { success: false, reason: "no_contacts" };
  }

  // Build message with location
  const message = location
    ? generateSOSMessage(location.latitude, location.longitude)
    : `🚨 EMERGENCY SOS ALERT!\nI need immediate help! (Location unavailable)\nTriggered via voice command.\nTimestamp: ${new Date().toLocaleString()}`;

  // Log activity
  logSOSTrigger("voice", location);

  // Send via Twilio edge function
  const edgeResult = await sendViaEdgeFunction(message);
  const edgeSuccess = edgeResult?.results?.some((r: any) => r.success);

  // If edge failed, try native SMS fallback
  if (!edgeSuccess) {
    sendViaNativeSMS(contacts, message);
  }

  // Also send WhatsApp
  sendAllWhatsApp(contacts, message);

  return { success: true, method: edgeSuccess ? "twilio" : "fallback" };
}
