import { useState, useMemo } from "react";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, AlertTriangle, MapPin, Download, TrendingUp, BarChart3, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface HotspotArea {
  areaKey: string;
  lat: number;
  lng: number;
  count: number;
  categories: Record<string, number>;
  severities: Record<string, number>;
  recentReports: { description: string | null; category: string; severity: string; created_at: string }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "hsl(var(--safe))",
  medium: "hsl(45, 90%, 55%)",
  high: "hsl(25, 90%, 55%)",
  critical: "hsl(var(--destructive))",
};

const CATEGORY_COLORS = ["hsl(var(--primary))", "hsl(var(--safe))", "hsl(45, 90%, 55%)", "hsl(25, 90%, 55%)", "hsl(280, 60%, 55%)", "hsl(200, 70%, 50%)"];

// Round to ~0.5km grid
const toGridKey = (lat: number, lng: number) => {
  const gridLat = (Math.round(lat * 200) / 200).toFixed(3);
  const gridLng = (Math.round(lng * 200) / 200).toFixed(3);
  return `${gridLat},${gridLng}`;
};

const HotspotAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState("all");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["safety-reports-hotspot", timeFilter],
    queryFn: async () => {
      let query = supabase.from("safety_reports").select("*").order("created_at", { ascending: false });

      if (timeFilter === "7d") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        query = query.gte("created_at", d.toISOString());
      } else if (timeFilter === "30d") {
        const d = new Date(); d.setDate(d.getDate() - 30);
        query = query.gte("created_at", d.toISOString());
      } else if (timeFilter === "90d") {
        const d = new Date(); d.setDate(d.getDate() - 90);
        query = query.gte("created_at", d.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hotspots = useMemo<HotspotArea[]>(() => {
    const map = new Map<string, HotspotArea>();
    for (const r of reports) {
      const key = toGridKey(r.latitude, r.longitude);
      if (!map.has(key)) {
        map.set(key, { areaKey: key, lat: r.latitude, lng: r.longitude, count: 0, categories: {}, severities: {}, recentReports: [] });
      }
      const h = map.get(key)!;
      h.count++;
      h.categories[r.category] = (h.categories[r.category] || 0) + 1;
      h.severities[r.severity] = (h.severities[r.severity] || 0) + 1;
      if (h.recentReports.length < 5) {
        h.recentReports.push({ description: r.description, category: r.category, severity: r.severity, created_at: r.created_at });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reports]);

  const topHotspots = hotspots.slice(0, 10);
  const maxCount = topHotspots[0]?.count || 1;

  const hotspotCoords = useMemo(() => topHotspots.map(h => ({ lat: h.lat, lng: h.lng })), [topHotspots]);
  const { getName } = useReverseGeocode(hotspotCoords);

  const severityDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const r of reports) {
      dist[r.severity] = (dist[r.severity] || 0) + 1;
    }
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const categoryDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const r of reports) {
      dist[r.category] = (dist[r.category] || 0) + 1;
    }
    return Object.entries(dist).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [reports]);

  const generatePDF = async () => {
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const now = new Date().toLocaleDateString("hi-IN", { year: "numeric", month: "long", day: "numeric" });

      // Title
      doc.setFontSize(20);
      doc.setTextColor(200, 40, 60);
      doc.text("RAKSHA - Mahila Suraksha Hotspot Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Report Generated: ${now}`, 14, 28);
      doc.text(`Total Reports Analyzed: ${reports.length}`, 14, 34);
      doc.text(`Dangerous Areas Identified: ${hotspots.length}`, 14, 40);

      // Summary
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Top Sensitive Areas (Sabse Khatarnak Ilake)", 14, 52);

      const tableData = topHotspots.map((h, i) => {
        const areaName = getName(h.lat, h.lng) || `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`;
        return [
          `#${i + 1}`,
          areaName,
          `https://maps.google.com/?q=${h.lat},${h.lng}`,
          h.count.toString(),
          Object.entries(h.categories).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}(${n})`).join(", "),
          Object.entries(h.severities).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}(${n})`).join(", "),
        ];
      });

      autoTable(doc, {
        startY: 56,
        head: [["Rank", "Location (Lat,Lng)", "Google Maps Link", "Total Incidents", "Categories", "Severity"]],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [200, 40, 60], textColor: [255, 255, 255] },
        columnStyles: { 2: { cellWidth: 45 } },
      });

      // Severity breakdown
      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFontSize(12);
      doc.text("Severity Breakdown:", 14, finalY + 12);
      const sevData = severityDistribution.map(s => [s.name, s.value.toString(), `${((s.value / reports.length) * 100).toFixed(1)}%`]);
      autoTable(doc, {
        startY: finalY + 16,
        head: [["Severity", "Count", "Percentage"]],
        body: sevData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 40, 60] },
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Yeh report Raksha Women Safety App dwara community reports ke basis par tayar ki gayi hai.", 14, doc.internal.pageSize.height - 20);
      doc.text("Kripya is report ko apne area ke police station mein submit karein.", 14, doc.internal.pageSize.height - 15);

      doc.save(`Raksha_Hotspot_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF Download Ho Gaya!", description: "Is report ko police station mein submit karein." });
    } catch (e) {
      toast({ title: "Error", description: "PDF generate nahi ho paya", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      low: "bg-[hsl(var(--safe))]/20 text-[hsl(var(--safe))]",
      medium: "bg-yellow-500/20 text-yellow-400",
      high: "bg-orange-500/20 text-orange-400",
      critical: "bg-destructive/20 text-destructive",
    };
    return <Badge className={`${variants[severity] || ""} border-0 text-[10px]`}>{severity}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14 pb-20">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-8 px-3 sm:px-4">
      <div className="container mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              Hotspot Analytics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Sabse khatarnak areas ki puri jaankari — Police ke liye report banao
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">7 Din</SelectItem>
                <SelectItem value="30d">30 Din</SelectItem>
                <SelectItem value="90d">90 Din</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generatePDF} disabled={generatingPdf || reports.length === 0} size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              {generatingPdf ? "Generating..." : "PDF Report"}
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <FileWarning className="w-5 h-5 mx-auto text-destructive mb-1" />
              <div className="text-xl font-bold text-foreground">{reports.length}</div>
              <div className="text-[10px] text-muted-foreground">Total Reports</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <MapPin className="w-5 h-5 mx-auto text-primary mb-1" />
              <div className="text-xl font-bold text-foreground">{hotspots.length}</div>
              <div className="text-[10px] text-muted-foreground">Sensitive Areas</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-orange-400 mb-1" />
              <div className="text-xl font-bold text-foreground">
                {reports.filter(r => r.severity === "critical" || r.severity === "high").length}
              </div>
              <div className="text-[10px] text-muted-foreground">High/Critical</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-[hsl(var(--safe))] mb-1" />
              <div className="text-xl font-bold text-foreground">{topHotspots[0]?.count || 0}</div>
              <div className="text-[10px] text-muted-foreground">Max in One Area</div>
            </CardContent>
          </Card>
        </div>

        {reports.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Abhi tak koi report nahi aayi hai.</p>
              <p className="text-xs text-muted-foreground mt-1">Safety Map page se reports add karein.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={categoryDistribution}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(215, 20%, 55%)" }} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(215, 20%, 55%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(220, 35%, 12%)", border: "1px solid hsl(220, 25%, 20%)", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="value" fill="hsl(355, 72%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Severity Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={severityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                        {severityDistribution.map((entry) => (
                          <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || "hsl(var(--muted))"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(220, 35%, 12%)", border: "1px solid hsl(220, 25%, 20%)", borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Hotspots List */}
            <Card className="border-border/50">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-destructive" />
                  Top {Math.min(10, hotspots.length)} Sabse Khatarnak Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-2 space-y-2">
                {topHotspots.map((h, i) => (
                  <div key={h.areaKey} className="p-3 rounded-lg bg-secondary/50 border border-border/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i < 3 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </span>
                        <div>
                          <a
                            href={`https://maps.google.com/?q=${h.lat},${h.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            📍 {getName(h.lat, h.lng) || `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`}
                          </a>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(h.severities).map(([s]) => getSeverityBadge(s))}
                          </div>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-foreground">{h.count}</span>
                    </div>
                    <Progress value={(h.count / maxCount) * 100} className="h-1.5" />
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(h.categories).map(([cat, n]) => (
                        <Badge key={cat} variant="outline" className="text-[10px] border-border/50">
                          {cat}: {n}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default HotspotAnalytics;
