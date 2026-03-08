import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/useAuth";

interface ScoreData {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  reports: number;
  factors: string[];
}

const calculateScore = (reports: any[], lat: number, lng: number): ScoreData => {
  // Count nearby reports within ~1km
  const nearby = reports.filter((r) => {
    const dLat = r.latitude - lat;
    const dLng = r.longitude - lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
    return dist < 1000;
  });

  const highSeverity = nearby.filter((r) => r.severity === "high").length;
  const medSeverity = nearby.filter((r) => r.severity === "medium").length;

  // Score: 100 = safest, 0 = most dangerous
  const penalty = highSeverity * 20 + medSeverity * 10;
  const rawScore = Math.max(0, 100 - penalty);

  // Time-based bonus (daytime is safer)
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 19;
  const timeBonus = isDaytime ? 10 : -15;
  const finalScore = Math.max(0, Math.min(100, rawScore + timeBonus));

  const factors: string[] = [];
  if (highSeverity > 0) factors.push(`${highSeverity} high-risk reports nearby`);
  if (medSeverity > 0) factors.push(`${medSeverity} medium-risk reports`);
  if (!isDaytime) factors.push("Evening/night hours");
  if (isDaytime) factors.push("Daytime safety bonus");
  if (nearby.length === 0) factors.push("No incidents reported nearby");

  if (finalScore >= 75) {
    return { score: finalScore, label: "Safe", color: "text-emerald-500", bgColor: "bg-emerald-500", reports: nearby.length, factors };
  } else if (finalScore >= 50) {
    return { score: finalScore, label: "Moderate", color: "text-amber-500", bgColor: "bg-amber-500", reports: nearby.length, factors };
  } else if (finalScore >= 25) {
    return { score: finalScore, label: "Caution", color: "text-orange-500", bgColor: "bg-orange-500", reports: nearby.length, factors };
  } else {
    return { score: finalScore, label: "High Risk", color: "text-destructive", bgColor: "bg-destructive", reports: nearby.length, factors };
  }
};

const SafetyScoreCard = () => {
  const { user } = useAuth();
  const { location, getLocation, loading: locLoading } = useGeolocation();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchScore = async () => {
    if (!location) {
      getLocation();
      return;
    }
    setLoading(true);

    const { data: reports } = await supabase
      .from("safety_reports")
      .select("latitude, longitude, category, severity");

    if (reports) {
      const data = calculateScore(reports, location.latitude, location.longitude);
      setScoreData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (location && !scoreData) fetchScore();
  }, [location]);

  if (!user) return null;

  return (
    <div className="glass-card p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Area Safety Score</p>
        </div>
        {!scoreData && (
          <button
            onClick={fetchScore}
            disabled={loading || locLoading}
            className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
          >
            {loading || locLoading ? "Checking..." : "Check Now"}
          </button>
        )}
      </div>

      {!scoreData ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <p>Tap "Check Now" to analyze your area's safety</p>
        </div>
      ) : (
        <div>
          {/* Score Display */}
          <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
            <div className="flex items-center gap-4">
              {/* Circular score */}
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    className={scoreData.color.replace("text-", "stroke-")}
                    strokeWidth="3"
                    strokeDasharray={`${scoreData.score}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreData.color}`}>
                  {scoreData.score}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  {scoreData.score >= 50 ? (
                    <CheckCircle className={`w-4 h-4 ${scoreData.color}`} />
                  ) : (
                    <AlertTriangle className={`w-4 h-4 ${scoreData.color}`} />
                  )}
                  <span className={`text-sm font-semibold ${scoreData.color}`}>{scoreData.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {scoreData.reports} report{scoreData.reports !== 1 ? "s" : ""} within 1km · Tap for details
                </p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); fetchScore(); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <Loader2 className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </button>

          {/* Expanded factors */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
              {scoreData.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${scoreData.bgColor}`} />
                  <p className="text-xs text-muted-foreground">{f}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafetyScoreCard;
