import { useEffect, useRef, useCallback, useState } from "react";

const DISTRESS_KEYWORDS = [
  "help", "bachao", "save me", "emergency", "sos",
  "danger", "please help", "help me", "call police",
];

interface UseVoiceDetectionOptions {
  enabled: boolean;
  onDistressDetected: () => void;
  debounceMs?: number;
}

const useVoiceDetection = ({
  enabled,
  onDistressDetected,
  debounceMs = 5000,
}: UseVoiceDetectionOptions) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const lastTrigger = useRef(0);
  const restartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      // Auto-restart if still enabled
      if (enabled) {
        restartTimeout.current = setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 500);
      }
    };
    recognition.onerror = (e: any) => {
      // "no-speech" and "aborted" are non-fatal
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("Speech recognition error:", e.error);
      }
    };

    recognition.onresult = (event: any) => {
      const now = Date.now();
      if (now - lastTrigger.current < debounceMs) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        const detected = DISTRESS_KEYWORDS.some((kw) => transcript.includes(kw));
        if (detected) {
          lastTrigger.current = now;
          onDistressDetected();
          break;
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  }, [enabled, onDistressDetected, debounceMs]);

  const stopListening = useCallback(() => {
    if (restartTimeout.current) clearTimeout(restartTimeout.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, startListening, stopListening]);

  return { listening, supported };
};

export default useVoiceDetection;
