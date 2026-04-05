import { supabase } from "@/integrations/supabase/client";

interface Contact {
  name: string;
  phone: string;
}

/**
 * Opens WhatsApp with pre-filled message for a single contact.
 */
export const sendViaWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
};

/**
 * Sends WhatsApp messages to all contacts (with staggered opens).
 */
export const sendAllWhatsApp = (contacts: Contact[], message: string) => {
  contacts.forEach((contact, i) => {
    setTimeout(() => sendViaWhatsApp(contact.phone, message), i * 600);
  });
};

/**
 * Sends SMS via Twilio edge function automatically (no app opening).
 * Returns results array or null on failure.
 */
export const sendViaEdgeFunction = async (message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { message },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Edge function SMS failed:", err);
    return null;
  }
};

/**
 * Opens native SMS app as a manual fallback (user must tap Send).
 * Only used when user explicitly clicks the button.
 */
export const sendViaNativeSMS = (contacts: Contact[], message: string) => {
  const phones = contacts.map((c) => c.phone).join(",");
  const encoded = encodeURIComponent(message);
  const smsUri = `sms:${phones}?body=${encoded}`;
  window.open(smsUri, "_self");
};

/**
 * Master alert function — sends SMS automatically via Twilio.
 * No native app opening — fully automatic.
 */
export const sendEmergencyAlert = async (
  contacts: Contact[],
  message: string
): Promise<{ method: "twilio" | "failed"; success: boolean; edgeResult?: any }> => {
  const edgeResult = await sendViaEdgeFunction(message);
  const successCount = edgeResult?.results?.filter((r: any) => r.success).length || 0;

  if (successCount > 0) {
    return { method: "twilio", success: true, edgeResult };
  }

  return { method: "failed", success: false, edgeResult };
};
