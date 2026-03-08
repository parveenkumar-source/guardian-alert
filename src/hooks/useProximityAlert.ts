import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

interface SafetyReport {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
}

const PROXIMITY_RADIUS_M = 200; // alert when within 200 meters
const POLL_INTERVAL_MS = 15_000; // check every 15 seconds
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown per report

/** Haversine distance in meters */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const useProximityAlert = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const alertedRef = useRef<Map<string, number>>(new Map()); // reportId → timestamp
  const watchIdRef = useRef<number | null>(null);
  const reportsRef = useRef<SafetyReport[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch reports periodically
  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("safety_reports")
      .select("id, latitude, longitude, category, severity")
      .in("severity", ["medium", "high"]);
    if (data) reportsRef.current = data;
  }, []);

  // Notify contacts via SMS edge function
  const notifyContacts = useCallback(
    async (report: SafetyReport, lat: number, lng: number) => {
      if (!user) return;

      // Fetch contacts
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("name, phone")
        .eq("user_id", user.id);

      if (!contacts || contacts.length === 0) return;

      const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
      const categoryLabel =
        report.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const message = `⚠️ Safety Alert: ${user.email?.split("@")[0] || "Your contact"} has entered an area flagged as "${categoryLabel}" (${report.severity} severity).\n📍 Location: ${mapLink}`;

      for (const contact of contacts) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: { to: contact.phone, message },
          });
        } catch {
          // silently continue
        }
      }

      // Log
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        trigger_type: "proximity_alert",
        message: `Entered unsafe area: ${categoryLabel}`,
        latitude: lat,
        longitude: lng,
      } as any);

      toast({
        title: "⚠️ Unsafe Area Alert",
        description: `You're near a "${categoryLabel}" zone. Your contacts have been notified.`,
      });
    },
    [user, toast]
  );

  // Check position against reports
  const checkProximity = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const now = Date.now();

      for (const report of reportsRef.current) {
        const dist = haversine(latitude, longitude, report.latitude, report.longitude);
        if (dist > PROXIMITY_RADIUS_M) continue;

        const lastAlerted = alertedRef.current.get(report.id);
        if (lastAlerted && now - lastAlerted < COOLDOWN_MS) continue;

        alertedRef.current.set(report.id, now);
        notifyContacts(report, latitude, longitude);
      }
    },
    [notifyContacts]
  );

  useEffect(() => {
    const enabled = user && settings.proximity_alert && navigator.geolocation;
    if (!enabled) {
      // Clean up
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Fetch reports now and periodically
    fetchReports();
    intervalRef.current = setInterval(fetchReports, 60_000);

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(checkProximity, undefined, {
      enableHighAccuracy: true,
      maximumAge: POLL_INTERVAL_MS,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, settings.proximity_alert, fetchReports, checkProximity]);
};

export default useProximityAlert;
