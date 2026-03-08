import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation, MapPin, Share2, Square, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TRACK_INTERVAL_MS = 15000; // 15 seconds

const JourneyTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [journey, setJourney] = useState<{
    id: string;
    share_token: string;
    destination_name: string;
    started_at: string;
  } | null>(null);
  const [destination, setDestination] = useState("");
  const [starting, setStarting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [elapsed, setElapsed] = useState("");
  const trackInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingStarted = useRef(false);

  // Fetch active journey with React Query caching
  const { data: journeyData } = useQuery({
    queryKey: ["active-journey", user?.id],
    queryFn: async () => {
      const { data } = (await supabase
        .from("journeys" as any)
        .select("id, share_token, destination_name, started_at")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as any;
      return data ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (journeyData && !trackingStarted.current) {
      setJourney(journeyData);
      startTracking(journeyData.id);
      trackingStarted.current = true;
    }
    return () => stopIntervals();
  }, [journeyData]);

  // Elapsed time display
  useEffect(() => {
    if (!journey) {
      if (elapsedInterval.current) clearInterval(elapsedInterval.current);
      setElapsed("");
      return;
    }
    const update = () => {
      const diff = Date.now() - new Date(journey.started_at).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      setElapsed(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`);
    };
    update();
    elapsedInterval.current = setInterval(update, 10000);
    return () => {
      if (elapsedInterval.current) clearInterval(elapsedInterval.current);
    };
  }, [journey]);

  const stopIntervals = () => {
    if (trackInterval.current) clearInterval(trackInterval.current);
    if (elapsedInterval.current) clearInterval(elapsedInterval.current);
  };

  const recordPoint = useCallback(
    async (journeyId: string) => {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        );

        await supabase.from("journey_points" as any).insert({
          journey_id: journeyId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        } as any);

        setPointCount((c) => c + 1);
      } catch (err) {
        console.error("Location tracking error:", err);
      }
    },
    []
  );

  const startTracking = useCallback(
    (journeyId: string) => {
      // Record immediately then at intervals
      recordPoint(journeyId);
      trackInterval.current = setInterval(() => recordPoint(journeyId), TRACK_INTERVAL_MS);
    },
    [recordPoint]
  );

  const startJourney = async () => {
    if (!user || !destination.trim()) {
      toast({ title: "Enter a destination", variant: "destructive" });
      return;
    }
    setStarting(true);

    try {
      const { data, error } = (await supabase
        .from("journeys" as any)
        .insert({
          user_id: user.id,
          destination_name: destination.trim().slice(0, 200),
        } as any)
        .select("id, share_token, destination_name, started_at")
        .single()) as any;

      if (error) throw error;

      setJourney(data);
      setPointCount(0);
      startTracking(data.id);

      // Log activity
      await supabase.from("activity_logs" as any).insert({
        user_id: user.id,
        trigger_type: "journey_start",
        message: `Journey started to: ${destination.trim()}`,
      } as any);

      toast({ title: "Journey tracking started!", description: "Share the link with your trusted contacts." });
    } catch (err) {
      console.error("Start journey error:", err);
      toast({ title: "Failed to start journey", variant: "destructive" });
    }

    setStarting(false);
  };

  const endJourney = async () => {
    if (!journey || !user) return;
    stopIntervals();

    await supabase
      .from("journeys" as any)
      .update({ is_active: false, ended_at: new Date().toISOString() } as any)
      .eq("id", journey.id);

    await supabase.from("activity_logs" as any).insert({
      user_id: user.id,
      trigger_type: "journey_end",
      message: `Journey to ${journey.destination_name} completed`,
    } as any);

    setJourney(null);
    setDestination("");
    toast({ title: "Journey ended safely ✅" });
  };

  const getShareUrl = () => {
    if (!journey) return "";
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vesarikimppomvxzfxxe";
    return `https://${projectId}.supabase.co/functions/v1/track-journey?token=${journey.share_token}`;
  };

  const shareLink = async () => {
    const url = getShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Raksha — Track My Journey",
          text: `I'm sharing my live location on my way to ${journey?.destination_name}. Track me here:`,
          url,
        });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!user) return null;

  // Active journey display
  if (journey) {
    return (
      <div className="glass-card p-4 w-full border border-primary/30 bg-primary/5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Journey Active</p>
              <p className="text-xs text-muted-foreground">
                To: {journey.destination_name} · {elapsed} · {pointCount} points
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={shareLink}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Live Link
              </>
            )}
          </button>
          <button
            onClick={endJourney}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            End
          </button>
        </div>
      </div>
    );
  }

  // Start journey form
  return (
    <div className="glass-card p-4 w-full">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Journey Tracking</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Where are you going?"
          value={destination}
          onChange={(e) => setDestination(e.target.value.slice(0, 200))}
          maxLength={200}
          className="flex-1 rounded-lg bg-secondary/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <button
          onClick={startJourney}
          disabled={starting || !destination.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {starting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Start
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Your live route will be shareable with trusted contacts until you arrive.
      </p>
    </div>
  );
};

export default JourneyTracker;
