import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { MapPin, AlertTriangle, Plus, X, Shield, Eye, Flame, Moon, Car, Users, ThumbsUp, ThumbsDown } from "lucide-react";

interface SafetyReport {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string | null;
  severity: string;
  created_at: string;
  upvotes: number;
}

interface VoteRecord {
  report_id: string;
  vote_type: number;
}

const CATEGORIES = [
  { value: "poor_lighting", label: "Poor Lighting", icon: Moon },
  { value: "harassment", label: "Harassment Hotspot", icon: AlertTriangle },
  { value: "unsafe_traffic", label: "Unsafe Traffic", icon: Car },
  { value: "isolated_area", label: "Isolated Area", icon: Eye },
  { value: "crime", label: "Crime Reported", icon: Flame },
  { value: "crowd_risk", label: "Crowd Risk", icon: Users },
  { value: "general", label: "General Unsafe", icon: Shield },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-500/80",
  medium: "bg-orange-500/80",
  high: "bg-destructive/80",
};

const getCategoryInfo = (value: string) =>
  CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

const SafetyMap = () => {
  const { user } = useAuth();
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("general");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { up: number; down: number }>>({});
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("safety_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setReports(data);
  }, []);

  const fetchVotes = useCallback(async (reportIds: string[]) => {
    if (reportIds.length === 0) return;

    // Fetch all votes for these reports
    const { data: allVotes } = await supabase
      .from("report_votes")
      .select("report_id, vote_type, user_id")
      .in("report_id", reportIds);

    if (allVotes) {
      const counts: Record<string, { up: number; down: number }> = {};
      const myVotes: Record<string, number> = {};

      for (const vote of allVotes) {
        if (!counts[vote.report_id]) counts[vote.report_id] = { up: 0, down: 0 };
        if (vote.vote_type === 1) counts[vote.report_id].up++;
        else counts[vote.report_id].down++;

        if (user && vote.user_id === user.id) {
          myVotes[vote.report_id] = vote.vote_type;
        }
      }

      setVoteCounts(counts);
      setUserVotes(myVotes);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (reports.length > 0) {
      fetchVotes(reports.map((r) => r.id));
    }
  }, [reports, fetchVotes]);

  useEffect(() => {
    if (location && !mapCenter) {
      setMapCenter({ lat: location.latitude, lng: location.longitude });
    }
  }, [location, mapCenter]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const handleVote = async (reportId: string, voteType: number) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to vote.", variant: "destructive" });
      return;
    }

    setVotingId(reportId);
    const currentVote = userVotes[reportId];

    try {
      if (currentVote === voteType) {
        // Remove vote (toggle off)
        await supabase
          .from("report_votes")
          .delete()
          .eq("report_id", reportId)
          .eq("user_id", user.id);

        setUserVotes((prev) => {
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
        setVoteCounts((prev) => ({
          ...prev,
          [reportId]: {
            up: (prev[reportId]?.up || 0) - (voteType === 1 ? 1 : 0),
            down: (prev[reportId]?.down || 0) - (voteType === -1 ? 1 : 0),
          },
        }));
      } else if (currentVote !== undefined) {
        // Change vote
        await supabase
          .from("report_votes")
          .update({ vote_type: voteType })
          .eq("report_id", reportId)
          .eq("user_id", user.id);

        setUserVotes((prev) => ({ ...prev, [reportId]: voteType }));
        setVoteCounts((prev) => ({
          ...prev,
          [reportId]: {
            up: (prev[reportId]?.up || 0) + (voteType === 1 ? 1 : -1),
            down: (prev[reportId]?.down || 0) + (voteType === -1 ? 1 : -1),
          },
        }));
      } else {
        // New vote
        await supabase.from("report_votes").insert({
          report_id: reportId,
          user_id: user.id,
          vote_type: voteType,
        });

        setUserVotes((prev) => ({ ...prev, [reportId]: voteType }));
        setVoteCounts((prev) => ({
          ...prev,
          [reportId]: {
            up: (prev[reportId]?.up || 0) + (voteType === 1 ? 1 : 0),
            down: (prev[reportId]?.down || 0) + (voteType === -1 ? 1 : 0),
          },
        }));
      }
    } catch {
      toast({ title: "Error", description: "Failed to register vote.", variant: "destructive" });
    }
    setVotingId(null);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit a report.", variant: "destructive" });
      return;
    }
    if (!location) {
      toast({ title: "Location required", description: "Enable location to report an unsafe area.", variant: "destructive" });
      getLocation();
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("safety_reports").insert({
      user_id: user.id,
      latitude: location.latitude,
      longitude: location.longitude,
      category,
      severity,
      description: description.trim() || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" });
    } else {
      toast({ title: "Report submitted", description: "Thank you for helping keep the community safe." });
      setShowForm(false);
      setDescription("");
      setCategory("general");
      setSeverity("medium");
      fetchReports();
    }
    setLoading(false);
  };

  const timeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getNetScore = (reportId: string) => {
    const counts = voteCounts[reportId];
    if (!counts) return 0;
    return counts.up - counts.down;
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 page-transition">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              Community Safety Map
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Report and view unsafe areas in your community
            </p>
          </div>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              if (!location) getLocation();
            }}
            variant={showForm ? "outline" : "default"}
            className="gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Report Area"}
          </Button>
        </div>

        {/* Report Form */}
        {showForm && (
          <Card className="border-primary/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Report Unsafe Area</CardTitle>
              <CardDescription>
                Your current location will be used.{" "}
                {location
                  ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : "Fetching location..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Dark alley with no streetlights"
                  maxLength={300}
                />
              </div>
              <Button onClick={handleSubmit} disabled={loading || !location} className="w-full">
                {loading ? "Submitting..." : "Submit Report"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Map visualization using embedded Leaflet */}
        <Card className="overflow-hidden">
          <div className="relative w-full h-[400px] bg-secondary">
            {mapCenter ? (
              <iframe
                title="Safety Map"
                className="w-full h-full border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.02},${mapCenter.lat - 0.015},${mapCenter.lng + 0.02},${mapCenter.lat + 0.015}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <MapPin className="w-6 h-6 mr-2 animate-pulse" />
                Loading map...
              </div>
            )}
          </div>
        </Card>

        {/* Reports list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Reports ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No reports yet. Be the first to help your community!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {reports.map((report) => {
                const catInfo = getCategoryInfo(report.category);
                const Icon = catInfo.icon;
                const myVote = userVotes[report.id];
                const netScore = getNetScore(report.id);
                const isVoting = votingId === report.id;
                return (
                  <Card key={report.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Vote column */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleVote(report.id, 1)}
                            disabled={isVoting}
                            className={`p-1.5 rounded-md transition-colors ${
                              myVote === 1
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            }`}
                            aria-label="Upvote"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <span className={`text-xs font-bold tabular-nums ${
                            netScore > 0 ? "text-primary" : netScore < 0 ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {netScore}
                          </span>
                          <button
                            onClick={() => handleVote(report.id, -1)}
                            disabled={isVoting}
                            className={`p-1.5 rounded-md transition-colors ${
                              myVote === -1
                                ? "bg-destructive/20 text-destructive"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            }`}
                            aria-label="Downvote"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_COLORS[report.severity] || "bg-muted"}`}>
                          <Icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground text-sm">{catInfo.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{timeSince(report.created_at)}</span>
                          </div>
                          {report.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
                            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              report.severity === "high" ? "bg-destructive/20 text-destructive" :
                              report.severity === "medium" ? "bg-orange-500/20 text-orange-400" :
                              "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {report.severity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyMap;
