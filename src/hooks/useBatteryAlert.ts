import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const BATTERY_THRESHOLD = 0.15; // 15%
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: "levelchange", listener: () => void): void;
  removeEventListener(type: "levelchange", listener: () => void): void;
}

const useBatteryAlert = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const lastAlertRef = useRef<number>(0);
  const batteryRef = useRef<BatteryManager | null>(null);

  useEffect(() => {
    if (!user || !("getBattery" in navigator)) return;

    const handleLevelChange = async () => {
      const battery = batteryRef.current;
      if (!battery || battery.charging) return;
      if (battery.level > BATTERY_THRESHOLD) return;

      const now = Date.now();
      if (now - lastAlertRef.current < COOLDOWN_MS) return;
      lastAlertRef.current = now;

      // Get location
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      // Fetch contacts
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("name, phone")
        .eq("user_id", user.id);

      if (!contacts || contacts.length === 0) return;

      const pct = Math.round(battery.level * 100);
      const mapLink = lat && lng ? `\n📍 Last location: https://www.google.com/maps?q=${lat},${lng}` : "";
      const message = `🔋 Battery Alert: ${user.email?.split("@")[0] || "Your contact"}'s phone is at ${pct}% battery.${mapLink}\nPlease check on them if you can't reach them.`;

      for (const contact of contacts) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: { to: contact.phone, message },
          });
        } catch {}
      }

      // Log
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        trigger_type: "battery_alert",
        message: `Low battery alert sent (${pct}%)`,
        latitude: lat,
        longitude: lng,
      } as any);

      toast({
        title: `🔋 Low Battery Alert Sent`,
        description: `Your contacts were notified that your phone is at ${pct}%.`,
      });
    };

    (navigator as any).getBattery().then((battery: BatteryManager) => {
      batteryRef.current = battery;
      // Check immediately
      handleLevelChange();
      battery.addEventListener("levelchange", handleLevelChange);
    });

    return () => {
      if (batteryRef.current) {
        batteryRef.current.removeEventListener("levelchange", () => {});
      }
    };
  }, [user, toast]);
};

export default useBatteryAlert;
