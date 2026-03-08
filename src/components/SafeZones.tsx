import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Plus, Trash2, Shield, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

const RADIUS_OPTIONS = [100, 200, 500, 1000];

const SafeZones = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [radius, setRadius] = useState(200);
  const [adding, setAdding] = useState(false);
  const alertedRef = useRef<Set<string>>(new Set());
  const watchIdRef = useRef<number | null>(null);

  const { data: zones = [] } = useQuery({
    queryKey: ["safe-zones", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("safe_zones" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }) as any;
      return (data ?? []) as SafeZone[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Haversine distance
  const haversine = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Monitor safe zone exits
  useEffect(() => {
    if (!user || zones.length === 0 || !navigator.geolocation) return;

    const checkPosition = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;

      for (const zone of zones) {
        const dist = haversine(latitude, longitude, zone.latitude, zone.longitude);
        const isOutside = dist > zone.radius_meters;
        const alertKey = zone.id;

        if (isOutside && !alertedRef.current.has(alertKey)) {
          alertedRef.current.add(alertKey);

          // Notify contacts
          const { data: contacts } = await supabase
            .from("emergency_contacts")
            .select("name, phone")
            .eq("user_id", user.id);

          if (contacts && contacts.length > 0) {
            const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            const message = `📍 Safe Zone Alert: ${user.email?.split("@")[0] || "Your contact"} has left their "${zone.name}" safe zone.\nCurrent location: ${mapLink}`;

            for (const contact of contacts) {
              try {
                await supabase.functions.invoke("send-sms", {
                  body: { to: contact.phone, message },
                });
              } catch {}
            }
          }

          await supabase.from("activity_logs").insert({
            user_id: user.id,
            trigger_type: "safe_zone_exit",
            message: `Left safe zone: ${zone.name}`,
            latitude,
            longitude,
          } as any);

          toast({
            title: "⚠️ Left Safe Zone",
            description: `You've left "${zone.name}". Your contacts have been notified.`,
          });
        } else if (!isOutside && alertedRef.current.has(alertKey)) {
          alertedRef.current.delete(alertKey);
        }
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(checkPosition, undefined, {
      enableHighAccuracy: true,
      maximumAge: 30000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [user, zones, haversine, toast]);

  const addZone = async () => {
    if (!user || !zoneName.trim()) return;
    setAdding(true);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      await supabase.from("safe_zones" as any).insert({
        user_id: user.id,
        name: zoneName.trim(),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radius_meters: radius,
      } as any);

      queryClient.invalidateQueries({ queryKey: ["safe-zones"] });
      setZoneName("");
      setShowAdd(false);
      toast({ title: "Safe zone added ✅", description: `"${zoneName}" set at your current location.` });
    } catch {
      toast({ title: "Location required", description: "Please enable GPS to set a safe zone.", variant: "destructive" });
    }

    setAdding(false);
  };

  const deleteZone = async (id: string) => {
    await supabase.from("safe_zones" as any).update({ is_active: false } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["safe-zones"] });
    toast({ title: "Safe zone removed" });
  };

  if (!user) return null;

  return (
    <div className="glass-card p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-foreground">Safe Zones</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 mb-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
          <input
            type="text"
            placeholder="Zone name (e.g., Home, Office)"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-1.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  radius === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </button>
            ))}
          </div>
          <button
            onClick={addZone}
            disabled={adding || !zoneName.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-500/90 transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Set at Current Location
          </button>
        </div>
      )}

      {zones.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No safe zones set. Add your home or work to get alerts when you leave.
        </p>
      ) : (
        <div className="space-y-1.5">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{zone.name}</p>
                  <p className="text-[10px] text-muted-foreground">{zone.radius_meters}m radius</p>
                </div>
              </div>
              <button
                onClick={() => deleteZone(zone.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SafeZones;
