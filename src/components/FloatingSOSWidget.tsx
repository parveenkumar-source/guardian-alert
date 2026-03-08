import { useState, useCallback, useRef } from "react";
import { ShieldAlert, X, Phone, MapPin, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { generateSOSMessage } from "@/lib/contacts";
import { logSOSTrigger } from "@/lib/activityLog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

const FloatingSOSWidget = () => {
  const routeLocation = useLocation();
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);

  if (routeLocation.pathname === "/ai-chat") return null;

  const quickSOS = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in first", variant: "destructive" });
      return;
    }
    setSending(true);
    getLocation();

    try {
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("name, phone")
        .eq("user_id", user.id);

      if (!contacts?.length) {
        toast({ title: "No contacts", description: "Add emergency contacts first.", variant: "destructive" });
        setSending(false);
        return;
      }

      const message = location
        ? generateSOSMessage(location.latitude, location.longitude, user.email?.split("@")[0])
        : `🚨 EMERGENCY SOS ALERT! I need immediate help! Location unavailable.`;

      for (const contact of contacts) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: { to: contact.phone, message },
          });
        } catch {}
      }

      logSOSTrigger("manual", location);
      toast({ title: "🚨 SOS Sent!", description: "Emergency contacts alerted." });
    } catch {
      toast({ title: "Failed to send SOS", variant: "destructive" });
    }

    setSending(false);
    setExpanded(false);
  }, [user, location, getLocation, toast]);

  const callEmergency = () => {
    window.location.href = "tel:112";
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-6">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-48 glass-card p-2 space-y-1.5 mb-2"
          >
            <button
              onClick={quickSOS}
              disabled={sending}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" />
              {sending ? "Sending..." : "Quick SOS Alert"}
            </button>
            <button
              onClick={callEmergency}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call 112
            </button>
            <button
              onClick={() => {
                getLocation();
                if (location) {
                  const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: "Location copied! 📋" });
                } else {
                  toast({ title: "Getting location...", description: "Try again in a moment." });
                }
                setExpanded(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Share Location
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setExpanded(!expanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          expanded
            ? "bg-secondary text-foreground rotate-45"
            : "bg-destructive text-white shadow-[0_0_20px_hsl(var(--destructive)/0.4)]"
        }`}
      >
        {expanded ? <X className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default FloatingSOSWidget;
