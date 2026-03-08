import { useState, useEffect } from "react";
import { Camera, Mic, Trash2, Download, Loader2, FileAudio, Image as ImageIcon, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

interface EvidenceRecord {
  id: string;
  file_type: string;
  file_path: string;
  sos_trigger_type: string;
  latitude: number | null;
  longitude: number | null;
  duration_seconds: number | null;
  created_at: string;
}

const Evidence = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await (supabase.from("evidence_recordings" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("evidence")
      .createSignedUrl(filePath, 300);
    if (error) throw error;
    return data.signedUrl;
  };

  const handleDownload = async (record: EvidenceRecord) => {
    try {
      const url = await getSignedUrl(record.file_path);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Failed to download", variant: "destructive" });
    }
  };

  const handleDelete = async (record: EvidenceRecord) => {
    setDeleting(record.id);
    try {
      await supabase.storage.from("evidence").remove([record.file_path]);
      await (supabase.from("evidence_recordings" as any) as any)
        .delete()
        .eq("id", record.id);
      setRecords((r) => r.filter((x) => x.id !== record.id));
      toast({ title: "Evidence deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const handleExportAll = async () => {
    if (records.length === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();

      // Add a metadata summary
      const summary = records.map((r) => ({
        file_type: r.file_type,
        trigger: r.sos_trigger_type,
        date: r.created_at,
        duration_seconds: r.duration_seconds,
        latitude: r.latitude,
        longitude: r.longitude,
      }));
      zip.file("evidence_summary.json", JSON.stringify(summary, null, 2));

      // Download and add each file
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          const { data, error } = await supabase.storage
            .from("evidence")
            .download(record.file_path);
          if (error || !data) continue;
          const ext = record.file_type === "audio" ? "webm" : "jpg";
          const date = new Date(record.created_at).toISOString().replace(/[:.]/g, "-");
          zip.file(`${i + 1}_${record.file_type}_${date}.${ext}`, data);
        } catch {
          // skip failed files
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `raksha-evidence-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Evidence exported", description: `${records.length} file(s) packaged into ZIP.` });
    } catch (err: any) {
      console.error("Export error:", err);
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Evidence Vault</h1>
            <p className="text-sm text-muted-foreground">Securely stored recordings & photos</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Camera className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No evidence recorded yet.</p>
            <p className="text-xs mt-1">Evidence is captured automatically during an SOS event.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="glass-card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  record.file_type === "audio" ? "bg-primary/10" : "bg-accent/10"
                }`}>
                  {record.file_type === "audio" ? (
                    <FileAudio className="w-5 h-5 text-primary" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-accent-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">
                    {record.file_type} · {record.sos_trigger_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(record.created_at)}
                    {record.duration_seconds ? ` · ${record.duration_seconds}s` : ""}
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleDownload(record)}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(record)}
                    disabled={deleting === record.id}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {deleting === record.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Evidence;
