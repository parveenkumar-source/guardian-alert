import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, X, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const DURATION_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hrs", minutes: 120 },
  { label: "4 hrs", minutes: 240 },
];

const SafetyCheckin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { location, getLocation } = useGeolocation();
  const queryClient = useQueryClient();
  const [activeCheckin, setActiveCheckin] = useState<{
    id: string;
    expires_at: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active check-in with React Query caching
  const { data: checkinData } = useQuery({
    queryKey: ["active-checkin", user?.id],
    queryFn: async () => {
      const { data } = (await supabase
        .from("safety_checkins" as any)
        .select("id, expires_at")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as any;
      return data ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (checkinData) setActiveCheckin(checkinData);
  }, [checkinData]);

  // Countdown timer
  useEffect(() => {
    if (!activeCheckin) {
      setTimeLeft("");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const update = () => {
      const diff = new Date(activeCheckin.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        setActiveCheckin(null);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`);
    };

    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeCheckin]);

  const startCheckin = useCallback(
    async (minutes: number) => {
      if (!user) return;
      setLoading(true);
      getLocation();

      const expiresAt = new Date(Date.now() + minutes * 60000).toISOString();

      const { data, error } = (await supabase
        .from("safety_checkins" as any)
        .insert({
          user_id: user.id,
          expires_at: expiresAt,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
        } as any)
        .select("id, expires_at")
        .single()) as any;

      if (error) {
        toast({ title: "Failed to start check-in", variant: "destructive" });
      } else {
        setActiveCheckin(data);
        setShowPicker(false);
        toast({
          title: "Safety check-in started",
          description: `You have ${minutes} minutes to check in.`,
        });
      }
      setLoading(false);
    },
    [user, location, getLocation, toast]
  );

  const checkIn = useCallback(async () => {
    if (!activeCheckin || !user) return;

    await supabase
      .from("safety_checkins" as any)
      .update({ is_active: false } as any)
      .eq("id", activeCheckin.id);

    // Log it
    await supabase.from("activity_logs" as any).insert({
      user_id: user.id,
      trigger_type: "checkin_ok",
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      message: "Safety check-in completed on time",
    } as any);

    setActiveCheckin(null);
    toast({ title: "Checked in safely! ✅" });
  }, [activeCheckin, user, location, toast]);

  const cancelCheckin = useCallback(async () => {
    if (!activeCheckin) return;

    await supabase
      .from("safety_checkins" as any)
      .update({ is_active: false } as any)
      .eq("id", activeCheckin.id);

    setActiveCheckin(null);
    toast({ title: "Check-in cancelled" });
  }, [activeCheckin, toast]);

  if (!user) return null;

  // Active check-in display
  if (activeCheckin) {
    const expiresMs = new Date(activeCheckin.expires_at).getTime() - Date.now();
    const isUrgent = expiresMs < 300000; // < 5 min

    return (
      <div
        className={`glass-card p-4 w-full border ${
          isUrgent ? "border-primary/50 bg-primary/5" : "border-safe/30 bg-safe/5"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isUrgent ? "bg-primary/15" : "bg-safe/15"
              }`}
            >
              <Timer className={`w-5 h-5 ${isUrgent ? "text-primary animate-pulse" : "text-safe"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Check-in Timer</p>
              <p className={`text-lg font-mono font-bold ${isUrgent ? "text-primary" : "text-safe"}`}>
                {timeLeft}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={checkIn}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-safe text-white text-sm font-medium hover:bg-safe/90 transition-colors"
            >
              <Check className="w-4 h-4" />
              I'm Safe
            </button>
            <button
              onClick={cancelCheckin}
              className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isUrgent && (
          <p className="text-xs text-primary mt-2">
            ⚠️ Check in soon or your emergency contacts will be alerted automatically.
          </p>
        )}
      </div>
    );
  }

  // Start check-in picker
  if (showPicker) {
    return (
      <div className="glass-card p-4 w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Set check-in duration</p>
          </div>
          <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => startCheckin(opt.minutes)}
              disabled={loading}
              className="px-2 py-2.5 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          If you don't check in before time runs out, your emergency contacts will be alerted.
        </p>
      </div>
    );
  }

  // Collapsed start button
  return (
    <button
      onClick={() => setShowPicker(true)}
      className="glass-card-hover p-3 w-full flex items-center gap-3 text-left"
    >
      <div className="w-9 h-9 rounded-full bg-safe/10 flex items-center justify-center">
        <Timer className="w-4.5 h-4.5 text-safe" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Safety Check-in</p>
        <p className="text-xs text-muted-foreground">Set a timer — get alerts if you don't check in</p>
      </div>
    </button>
  );
};

export default SafetyCheckin;
