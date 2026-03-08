import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import ReportComments from "@/components/ReportComments";
import {
  MapPin, AlertTriangle, Shield, Eye, Flame, Moon, Car, Users,
  ThumbsUp, ThumbsDown, Loader2, Filter, Navigation,
} from "lucide-react";

interface Report {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string | null;
  severity: string;
  created_at: string;
  upvotes: number;
}

const CATEGORIES: Record<string, { label: string; icon: React.ElementType }> = {
  poor_lighting: { label: "Poor Lighting", icon: Moon },
  harassment: { label: "Harassment Hotspot", icon: AlertTriangle },
  unsafe_traffic: { label: "Unsafe Traffic", icon: Car },
  isolated_area: { label: "Isolated Area", icon: Eye },
  crime: { label: "Crime Reported", icon: Flame },
  crowd_risk: { label: "Crowd Risk", icon: Users },
  general: { label: "General Unsafe", icon: Shield },
};

const RADIUS_OPTIONS = [1, 2, 5, 10, 25];

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CommunityFeed = () => {
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortBy, setSortBy] = useState<"recent" | "votes">("recent");
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { up: number; down: number }>>({});
  const [votingId, setVotingId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("safety_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) setReports(data);
    setLoading(false);
  }, []);

  const fetchVotes = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("report_votes")
        .select("report_id, vote_type, user_id")
        .in("report_id", ids);
      if (!data) return;

      const counts: Record<string, { up: number; down: number }> = {};
      const myVotes: Record<string, number> = {};
      for (const v of data) {
        if (!counts[v.report_id]) counts[v.report_id] = { up: 0, down: 0 };
        if (v.vote_type === 1) counts[v.report_id].up++;
        else counts[v.report_id].down++;
        if (user && v.user_id === user.id) myVotes[v.report_id] = v.vote_type;
      }
      setVoteCounts(counts);
      setUserVotes(myVotes);
    },
    [user]
  );

  useEffect(() => {
    fetchReports();

    // Real-time subscription for new/updated/deleted reports
    const channel = supabase
      .channel("community-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "safety_reports" },
        (payload) => {
          setReports((prev) => [payload.new as Report, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "safety_reports" },
        (payload) => {
          setReports((prev) => prev.filter((r) => r.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  const fetchCommentCounts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("report_comments")
      .select("report_id")
      .in("report_id", ids);
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.report_id] = (counts[row.report_id] || 0) + 1;
      }
      setCommentCounts(counts);
    }
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      const ids = reports.map((r) => r.id);
      fetchVotes(ids);
      fetchCommentCounts(ids);
    }
  }, [reports, fetchVotes, fetchCommentCounts]);

  const handleVote = async (reportId: string, voteType: number) => {
    if (!user) {
      toast({ title: "Sign in to vote", variant: "destructive" });
      return;
    }
    setVotingId(reportId);
    const current = userVotes[reportId];
    try {
      if (current === voteType) {
        await supabase.from("report_votes").delete().eq("report_id", reportId).eq("user_id", user.id);
        setUserVotes((p) => { const n = { ...p }; delete n[reportId]; return n; });
        setVoteCounts((p) => ({
          ...p,
          [reportId]: {
            up: (p[reportId]?.up || 0) - (voteType === 1 ? 1 : 0),
            down: (p[reportId]?.down || 0) - (voteType === -1 ? 1 : 0),
          },
        }));
      } else if (current !== undefined) {
        await supabase.from("report_votes").update({ vote_type: voteType }).eq("report_id", reportId).eq("user_id", user.id);
        setUserVotes((p) => ({ ...p, [reportId]: voteType }));
        setVoteCounts((p) => ({
          ...p,
          [reportId]: {
            up: (p[reportId]?.up || 0) + (voteType === 1 ? 1 : -1),
            down: (p[reportId]?.down || 0) + (voteType === -1 ? 1 : -1),
          },
        }));
      } else {
        await supabase.from("report_votes").insert({ report_id: reportId, user_id: user.id, vote_type: voteType });
        setUserVotes((p) => ({ ...p, [reportId]: voteType }));
        setVoteCounts((p) => ({
          ...p,
          [reportId]: {
            up: (p[reportId]?.up || 0) + (voteType === 1 ? 1 : 0),
            down: (p[reportId]?.down || 0) + (voteType === -1 ? 1 : 0),
          },
        }));
      }
    } catch {
      toast({ title: "Vote failed", variant: "destructive" });
    }
    setVotingId(null);
  };

  const getNet = (id: string) => (voteCounts[id]?.up || 0) - (voteCounts[id]?.down || 0);

  const filtered = reports
    .filter((r) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(r.category)) return false;
      if (!location) return true;
      return haversine(location.latitude, location.longitude, r.latitude, r.longitude) <= radiusKm;
    })
    .sort((a, b) => {
      if (sortBy === "votes") return getNet(b.id) - getNet(a.id);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const timeSince = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const distanceLabel = (r: Report) => {
    if (!location) return null;
    const d = haversine(location.latitude, location.longitude, r.latitude, r.longitude);
    return d < 1 ? `${Math.round(d * 1000)}m away` : `${d.toFixed(1)}km away`;
  };

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-12 px-4 page-transition">
      <div className="container mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Community Feed</h1>
            <p className="text-sm text-muted-foreground">Safety reports near you</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            Filters
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Radius</p>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    radiusKm === r
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Sort by</p>
            <div className="flex gap-1.5">
              {(["recent", "votes"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    sortBy === s
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "recent" ? "Most Recent" : "Most Upvoted"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORIES).map(([key, { label, icon: CatIcon }]) => (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategories.has(key)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : selectedCategories.size === 0
                      ? "bg-secondary text-muted-foreground hover:text-foreground"
                      : "bg-secondary/50 text-muted-foreground/60 hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <CatIcon className="w-3 h-3" />
                  {label}
                </button>
              ))}
              {selectedCategories.size > 0 && (
                <button
                  onClick={() => setSelectedCategories(new Set())}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading reports…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No reports within {radiusKm}km.</p>
            <p className="text-xs mt-1">
              {location ? "Try increasing the radius." : "Enable location for proximity filtering."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length} report{filtered.length !== 1 ? "s" : ""} within {radiusKm}km
            </p>

            {filtered.map((report) => {
              const cat = CATEGORIES[report.category] || CATEGORIES.general;
              const Icon = cat.icon;
              const myVote = userVotes[report.id];
              const net = getNet(report.id);
              const dist = distanceLabel(report);

              return (
                <div key={report.id} className="glass-card p-4 flex gap-3">
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleVote(report.id, 1)}
                      disabled={votingId === report.id}
                      className={`p-1.5 rounded-md transition-colors ${
                        myVote === 1
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        net > 0 ? "text-primary" : net < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {net}
                    </span>
                    <button
                      onClick={() => handleVote(report.id, -1)}
                      disabled={votingId === report.id}
                      className={`p-1.5 rounded-md transition-colors ${
                        myVote === -1
                          ? "bg-destructive/20 text-destructive"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          report.severity === "high"
                            ? "bg-destructive/80"
                            : report.severity === "medium"
                            ? "bg-orange-500/80"
                            : "bg-yellow-500/80"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{cat.label}</span>
                      <span
                        className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          report.severity === "high"
                            ? "bg-destructive/20 text-destructive"
                            : report.severity === "medium"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {report.severity}
                      </span>
                    </div>

                    {report.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">{report.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{timeSince(report.created_at)}</span>
                      {dist && (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {dist}
                        </span>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline ml-auto"
                      >
                        <MapPin className="w-3 h-3" />
                        Map
                      </a>
                    </div>
                    {/* Comments */}
                    <ReportComments
                      reportId={report.id}
                      isOpen={openCommentId === report.id}
                      onToggle={() => setOpenCommentId(openCommentId === report.id ? null : report.id)}
                      commentCount={commentCounts[report.id] || 0}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityFeed;
