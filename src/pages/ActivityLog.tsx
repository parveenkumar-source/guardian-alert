import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, MapPin, Clock, AlertTriangle } from "lucide-react";

interface LogEntry {
  id: string;
  trigger_type: string;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  created_at: string;
}

const triggerIcons: Record<string, string> = {
  manual: "🔴",
  shake: "📳",
  voice: "🎙️",
  stealth: "👁️‍🗨️",
};

const ActivityLog = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("activity_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50) as any;
      setLogs(data ?? []);
      setLoading(false);
    };
    fetchLogs();
  }, [user]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Activity Log</h1>
            <p className="text-sm text-muted-foreground">SOS trigger history for safety documentation</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No SOS events recorded yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Events will appear here when you trigger an SOS alert.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="glass-card p-4 flex items-start gap-3">
                <span className="text-xl mt-0.5">{triggerIcons[log.trigger_type] ?? "🔴"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {log.trigger_type} SOS
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  {log.latitude && log.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                    </a>
                  )}
                  {log.message && (
                    <p className="text-xs text-muted-foreground mt-1">{log.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
