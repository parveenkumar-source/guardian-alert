import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SafetyTip {
  title: string;
  description: string;
}

const SafetyTips = ({ location }: { location: { latitude: number; longitude: number } | null }) => {
  const [tips, setTips] = useState<SafetyTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTimeContext = () => {
    const now = new Date();
    const hour = now.getHours();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let timeOfDay: string;
    if (hour >= 5 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
    else if (hour >= 17 && hour < 21) timeOfDay = "evening";
    else timeOfDay = "night";
    return { timeOfDay, dayOfWeek: days[now.getDay()] };
  };

  const fetchTips = async () => {
    setLoading(true);
    setError(null);
    try {
      const { timeOfDay, dayOfWeek } = getTimeContext();
      const { data, error: fnError } = await supabase.functions.invoke("safety-tips", {
        body: {
          latitude: location?.latitude,
          longitude: location?.longitude,
          timeOfDay,
          dayOfWeek,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setTips(data?.tips || []);
    } catch (err: any) {
      console.error("Safety tips error:", err);
      setError("Could not load safety tips right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  if (error && tips.length === 0) {
    return null; // Silently hide if no tips available
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-warning" />
          <h3 className="font-display text-sm font-semibold text-foreground">AI Safety Tips</h3>
        </div>
        <button
          onClick={fetchTips}
          disabled={loading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && tips.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/3 mb-2" />
              <div className="h-2 bg-muted rounded w-full" />
              <div className="h-2 bg-muted rounded w-2/3 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="glass-card p-4 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "forwards" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-warning" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SafetyTips;
