import { useState, useEffect } from "react";
import { CheckCircle, MapPin, Share2, MessageCircle, Send, Mic, Phone } from "lucide-react";
import { generateSOSMessage } from "@/lib/contacts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { sendEmergencyAlert, sendViaNativeSMS, sendAllWhatsApp } from "@/lib/alertSender";
import EvidenceRecorder from "@/components/EvidenceRecorder";

interface Contact {
  name: string;
  phone: string;
}

interface AutoRecording {
  blob: Blob;
  duration: number;
}

interface SOSConfirmedProps {
  location: { latitude: number; longitude: number } | null;
  onDismiss: () => void;
  autoRecording?: AutoRecording | null;
}

const SOSConfirmed = ({ location, onDismiss, autoRecording }: SOSConfirmedProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alertStatus, setAlertStatus] = useState<"sending" | "sent" | "fallback" | "failed">("sending");
  const [alertMethod, setAlertMethod] = useState<string>("");
  const [whatsappSentTo, setWhatsappSentTo] = useState<Set<string>>(new Set());
  const [autoRecordingSaved, setAutoRecordingSaved] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { sendPushToSelf, subscribed: pushSubscribed } = usePushNotifications();

  // Auto-upload the pre-recorded audio
  useEffect(() => {
    if (!autoRecording || !user || autoRecordingSaved) return;
    const upload = async () => {
      try {
        const ts = Date.now();
        const filePath = `${user.id}/${ts}_audio.webm`;
        await supabase.storage.from("evidence").upload(filePath, autoRecording.blob, { contentType: "audio/webm" });
        await (supabase.from("evidence_recordings" as any) as any).insert({
          user_id: user.id,
          sos_trigger_type: "auto",
          file_type: "audio",
          file_path: filePath,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          duration_seconds: autoRecording.duration,
        });
        setAutoRecordingSaved(true);
        toast({ title: "Auto-recording saved", description: `${autoRecording.duration}s audio evidence stored securely.` });
      } catch (err: any) {
        console.error("Auto-recording upload error:", err);
      }
    };
    upload();
  }, [autoRecording, user]);

  const baseMessage = location
    ? generateSOSMessage(location.latitude, location.longitude)
    : "🚨 EMERGENCY SOS ALERT! I need immediate help!";

  const message = settings.custom_message
    ? `${baseMessage}\n\n${settings.custom_message}`
    : baseMessage;

  useEffect(() => {
    supabase
      .from("emergency_contacts")
      .select("name, phone")
      .then(({ data }) => {
        setContacts(data || []);
      });
  }, []);

  // Auto-send alerts on mount
  useEffect(() => {
    if (!contacts.length || !settings.notify_sms) return;

    const doAlert = async () => {
      setAlertStatus("sending");
      const result = await sendEmergencyAlert(contacts, message);
      
      if (result.success) {
        const successCount = result.edgeResult?.results?.filter((r: any) => r.success).length || 0;
        setAlertStatus("sent");
        setAlertMethod("SMS");
        toast({
          title: "✅ SMS Alert Sent!",
          description: `${successCount} contact${successCount !== 1 ? "s" : ""} notified automatically.`,
        });
      } else {
        setAlertStatus("failed");
        setAlertMethod("SMS");
        toast({
          title: "⚠️ SMS Failed",
          description: "Automatic SMS failed. Use WhatsApp or manual SMS below.",
          variant: "destructive",
        });
      }
    };
    doAlert();

    // Auto-send WhatsApp if enabled
    if (settings.notify_whatsapp) {
      sendAllWhatsApp(contacts, message);
    }

    // Also send push notification
    if (pushSubscribed) {
      sendPushToSelf(
        "🚨 SOS Alert Sent",
        location
          ? `Emergency alert sent with your location. Stay safe.`
          : "Emergency alert sent to your contacts."
      );
    }
  }, [contacts.length]);

  const openWhatsApp = (contact: Contact) => {
    const phone = contact.phone.replace(/[^\d]/g, "");
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
    setWhatsappSentTo((prev) => new Set(prev).add(contact.phone));
  };

  const handleSendAllWhatsApp = () => {
    sendAllWhatsApp(contacts, message);
    contacts.forEach((c) => setWhatsappSentTo((prev) => new Set(prev).add(c.phone)));
  };

  const handleNativeSMS = () => {
    sendViaNativeSMS(contacts, message);
    toast({ title: "📱 SMS App Opened", description: "Tap Send to alert your contacts." });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SOS Alert", text: message });
      } catch {}
    } else {
      navigator.clipboard.writeText(message);
      toast({ title: "Message copied to clipboard" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl overflow-y-auto">
      <div className="flex flex-col items-center gap-5 p-6 max-w-sm w-full text-center my-8">
        <div className="w-20 h-20 rounded-full bg-safe/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-safe" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground">SOS Alert Sent!</h2>
          <p className="text-muted-foreground text-sm">
            Emergency alerts prepared for {contacts.length} contact{contacts.length !== 1 ? "s" : ""}.
          </p>
          {alertStatus === "sending" && (
            <p className="text-xs text-primary animate-pulse">Sending alerts...</p>
          )}
          {alertStatus === "sent" && (
            <p className="text-xs text-safe">✅ {alertMethod} delivered successfully</p>
          )}
          {alertStatus === "failed" && (
            <p className="text-xs text-destructive">⚠️ Auto SMS failed — use WhatsApp or manual SMS below</p>
          )}
        </div>

        {location && (
          <div className="glass-card p-4 w-full">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              Open in Google Maps →
            </a>
          </div>
        )}

        <div className="glass-card p-4 w-full text-left">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Alert Message:</p>
          <p className="text-xs text-foreground/80 whitespace-pre-line">{message}</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2">
          <button
            onClick={handleNativeSMS}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Phone className="w-4 h-4" />
            Send via SMS
          </button>
          {contacts.length > 0 && settings.notify_whatsapp && (
            <button
              onClick={handleSendAllWhatsApp}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-[#25D366] text-white font-medium text-sm transition-all hover:bg-[#1ebe57] active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp All
            </button>
          )}
        </div>

        {/* Individual WhatsApp contacts */}
        {contacts.length > 0 && settings.notify_whatsapp && (
          <div className="w-full space-y-2">
            {contacts.map((contact) => (
              <button
                key={contact.phone}
                onClick={() => openWhatsApp(contact)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-secondary/80 hover:bg-secondary transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#25D366]/15 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#25D366]">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-foreground font-medium">{contact.name}</span>
                </div>
                {whatsappSentTo.has(contact.phone) ? (
                  <span className="text-xs text-safe">Opened ✓</span>
                ) : (
                  <Send className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Evidence Recording */}
        <EvidenceRecorder location={location} triggerType="manual" />

        <div className="flex gap-3 w-full">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-colors hover:bg-primary/90"
          >
            <Share2 className="w-4 h-4" />
            Share Alert
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm transition-colors hover:bg-secondary/80"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSConfirmed;
