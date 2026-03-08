import { useState, useEffect, useRef } from "react";
import { UserCheck, Share2, X, Loader2, MessageCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const WalkBuddy = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [buddyName, setBuddyName] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [shareLink, setShareLink] = useState("");
  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const journeyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const startWalk = async () => {
    if (!user || !buddyName.trim()) return;
    setStarting(true);

    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );

      const { data: journey, error } = await supabase
        .from("journeys")
        .insert({
          user_id: user.id,
          destination_name: `Walk with ${buddyName}`,
          destination_lat: pos.coords.latitude,
          destination_lng: pos.coords.longitude,
        })
        .select("id, share_token")
        .single();

      if (error || !journey) throw error;

      journeyIdRef.current = journey.id;
      const link = `${window.location.origin}/safe-routes?track=${journey.share_token}`;
      setShareLink(link);
      setActive(true);
      setElapsed(0);

      // Start tracking position
      watchRef.current = navigator.geolocation.watchPosition(
        async (p) => {
          await supabase.from("journey_points").insert({
            journey_id: journey.id,
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          });
        },
        undefined,
        { enableHighAccuracy: true, maximumAge: 10000 }
      );

      // Share with contacts
      const { data: contacts } = await supabase
        .from("emergency_contacts")
        .select("phone")
        .eq("user_id", user.id);

      if (contacts?.length) {
        const msg = `👋 ${user.email?.split("@")[0]} has started a buddy walk with "${buddyName}". Track live: ${link}`;
        for (const c of contacts) {
          try { await supabase.functions.invoke("send-sms", { body: { to: c.phone, message: msg } }); } catch {}
        }
      }

      toast({ title: "Walk Buddy started 🚶‍♀️", description: `Your contacts can now track you.` });
    } catch {
      toast({ title: "Location required", description: "Enable GPS to start.", variant: "destructive" });
    }
    setStarting(false);
  };

  const endWalk = async () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (journeyIdRef.current) {
      await supabase.from("journeys").update({ is_active: false, ended_at: new Date().toISOString() }).eq("id", journeyIdRef.current);
    }
    setActive(false);
    setBuddyName("");
    setShareLink("");
    journeyIdRef.current = null;
    toast({ title: "Walk ended safely ✅" });
  };

  const shareToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: "Link copied! 📋" });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!user) return null;

  if (active) {
    return (
      <div className="glass-card p-4 w-full border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-semibold text-foreground">Walking with {buddyName}</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{formatTime(elapsed)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={shareToClipboard}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Link
          </button>
          <button
            onClick={endWalk}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            End Walk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 w-full">
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="w-4 h-4 text-emerald-500" />
        <p className="text-sm font-semibold text-foreground">Walk Buddy</p>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Who's your buddy? (e.g., Mom, Friend)"
          value={buddyName}
          onChange={(e) => setBuddyName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={startWalk}
          disabled={starting || !buddyName.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-500/90 transition-colors disabled:opacity-50"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          Start Buddy Walk
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Your contacts will receive a live tracking link to walk with you virtually.
      </p>
    </div>
  );
};

export default WalkBuddy;
