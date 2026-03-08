import { useRef, useState, useCallback } from "react";

interface AutoRecording {
  blob: Blob;
  duration: number;
}

const useAutoRecording = () => {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<AutoRecording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        setResult({ blob, duration });
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start(1000);
      setRecording(true);
      setResult(null);
    } catch (err) {
      console.error("Auto-recording failed:", err);
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clear = useCallback(() => {
    stop();
    setResult(null);
    setRecording(false);
  }, [stop]);

  return { recording, result, start, stop, clear };
};

export default useAutoRecording;
