import { useState, useRef, useCallback } from "react";
import { Camera, Mic, MicOff, Square, Upload, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface EvidenceRecorderProps {
  location: { latitude: number; longitude: number } | null;
  triggerType?: string;
}

const EvidenceRecorder = ({ location, triggerType = "manual" }: EvidenceRecorderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBlob(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const uploadFile = useCallback(
    async (blob: Blob, fileType: "audio" | "photo") => {
      if (!user) return;
      const ext = fileType === "audio" ? "webm" : "jpg";
      const ts = Date.now();
      const filePath = `${user.id}/${ts}_${fileType}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(filePath, blob, { contentType: fileType === "audio" ? "audio/webm" : "image/jpeg" });

      if (uploadError) throw uploadError;

      // Save metadata
      await (supabase.from("evidence_recordings" as any) as any).insert({
        user_id: user.id,
        sos_trigger_type: triggerType,
        file_type: fileType,
        file_path: filePath,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        duration_seconds: fileType === "audio" ? elapsed : null,
      });

      return filePath;
    },
    [user, triggerType, location, elapsed]
  );

  const handleUploadAll = useCallback(async () => {
    if (!user) return;
    setUploading(true);
    const results: string[] = [];

    try {
      if (audioBlob) {
        const p = await uploadFile(audioBlob, "audio");
        if (p) results.push("audio");
      }
      if (photoBlob) {
        const p = await uploadFile(photoBlob, "photo");
        if (p) results.push("photo");
      }
      setUploaded(results);
      toast({
        title: "Evidence saved securely",
        description: `${results.length} file(s) uploaded and encrypted.`,
      });
    } catch (err: any) {
      console.error("Evidence upload error:", err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [user, audioBlob, photoBlob, uploadFile, toast]);

  const hasEvidence = audioBlob || photoBlob;
  const allUploaded = uploaded.length > 0;

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="glass-card p-4 w-full space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        Evidence Recording
      </h3>
      <p className="text-xs text-muted-foreground">
        Capture audio or photos as evidence. Files are encrypted and stored securely.
      </p>

      <div className="flex gap-2">
        {/* Audio recording */}
        {!audioBlob ? (
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              recording
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {recording ? (
              <>
                <Square className="w-3.5 h-3.5" />
                Stop · {formatTime(elapsed)}
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                Record Audio
              </>
            )}
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-safe/10 border border-safe/20 text-sm text-safe">
            <CheckCircle className="w-3.5 h-3.5" />
            Audio {formatTime(elapsed)}
          </div>
        )}

        {/* Photo capture */}
        {!photoBlob ? (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              Take Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-safe/10 border border-safe/20 text-sm text-safe">
            <CheckCircle className="w-3.5 h-3.5" />
            Photo ready
          </div>
        )}
      </div>

      {/* Audio preview */}
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full h-8 rounded" />
      )}

      {/* Photo preview */}
      {photoPreview && (
        <img src={photoPreview} alt="Evidence" className="w-full h-32 object-cover rounded-lg border border-border" />
      )}

      {/* Upload button */}
      {hasEvidence && !allUploaded && (
        <button
          onClick={handleUploadAll}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Encrypting & Uploading…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Save Evidence Securely
            </>
          )}
        </button>
      )}

      {allUploaded && (
        <div className="flex items-center justify-center gap-2 text-sm text-safe py-1">
          <CheckCircle className="w-4 h-4" />
          Evidence saved securely
        </div>
      )}
    </div>
  );
};

export default EvidenceRecorder;
