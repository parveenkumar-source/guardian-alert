import { supabase } from "@/integrations/supabase/client";

interface Contact {
  name: string;
  phone: string;
}

/**
 * Opens the native SMS app with pre-filled message for all contacts.
 * Works on mobile — user's own SMS plan is used, so it's 100% free.
 */
export const sendViaNativeSMS = (contacts: Contact[], message: string) => {
  // Build comma-separated phone list for sms: URI
  const phones = contacts.map((c) => c.phone).join(",");
  const encoded = encodeURIComponent(message);
  // iOS uses &body=, Android uses ?body= — using ? works on both for single recipient
  // For multiple, most platforms support comma-separated
  const smsUri = `sms:${phones}?body=${encoded}`;
  window.open(smsUri, "_self");
};

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
 * Tries to send alerts through the edge function (TextBelt).
 * Returns results array. If it fails, returns null so caller can use fallback.
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
 * Master alert function — tries edge function first, then opens native SMS as fallback.
 */
export const sendEmergencyAlert = async (
  contacts: Contact[],
  message: string,
  options?: { skipEdgeFunction?: boolean }
): Promise<{ method: "edge" | "native_sms" | "both"; edgeResult?: any }> => {
  if (options?.skipEdgeFunction) {
    sendViaNativeSMS(contacts, message);
    return { method: "native_sms" };
  }

  // Try edge function first
  const edgeResult = await sendViaEdgeFunction(message);
  const edgeSuccess = edgeResult?.results?.some((r: any) => r.success);

  if (edgeSuccess) {
    return { method: "edge", edgeResult };
  }

  // Edge function failed — fallback to native SMS
  sendViaNativeSMS(contacts, message);
  return { method: "both", edgeResult };
};
