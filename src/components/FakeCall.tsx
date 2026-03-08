import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FakeCallProps {
  callerName?: string;
  delay?: number; // seconds before call rings
  onEnd?: () => void;
}

const RING_PATTERN = [
  // Frequencies and durations for a phone ring tone (Web Audio API)
  { freq: 440, duration: 0.4 },
  { freq: 480, duration: 0.4 },
];

const FakeCall = ({ callerName = "Mom", delay = 5, onEnd }: FakeCallProps) => {
  const [phase, setPhase] = useState<"waiting" | "ringing" | "connected" | "ended">("waiting");
  const [waitSeconds, setWaitSeconds] = useState(delay);
  const [callDuration, setCallDuration] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Countdown to ring
  useEffect(() => {
    if (phase !== "waiting") return;
    if (waitSeconds <= 0) {
      setPhase("ringing");
      return;
    }
    const t = setTimeout(() => setWaitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, waitSeconds]);

  // Ring sound using Web Audio API
  const startRinging = useCallback(() => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const playRing = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
        oscillatorRef.current = osc;
        gainRef.current = gain;
      };

      playRing();
      ringIntervalRef.current = setInterval(playRing, 2000);
    } catch {
      // Audio not supported — silent ring
    }
  }, []);

  const stopRinging = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase === "ringing") {
      startRinging();
      // Vibrate if supported
      if (navigator.vibrate) {
        const vibrateLoop = setInterval(() => navigator.vibrate([300, 200, 300, 200, 300]), 2000);
        return () => {
          clearInterval(vibrateLoop);
          navigator.vibrate(0);
          stopRinging();
        };
      }
      return () => stopRinging();
    }
  }, [phase, startRinging, stopRinging]);

  // Call duration timer
  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const answer = () => {
    stopRinging();
    navigator.vibrate?.(0);
    setPhase("connected");
  };

  const decline = () => {
    stopRinging();
    navigator.vibrate?.(0);
    setPhase("ended");
    onEnd?.();
  };

  const hangUp = () => {
    setPhase("ended");
    onEnd?.();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (phase === "waiting") {
    return (
      <div className="glass-card p-4 flex items-center justify-between animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Fake call in {waitSeconds}s</p>
            <p className="text-xs text-muted-foreground">From {callerName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={decline}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (phase === "ended") return null;

  // Full-screen call UI
  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center gap-16 px-6 animate-in fade-in duration-200 overflow-hidden" style={{ touchAction: "none" }}>
      {/* Caller info */}
      <div className="flex flex-col items-center gap-4 mt-12">
        <div className={`w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center ${phase === "ringing" ? "animate-pulse" : ""}`}>
          <User className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-foreground">{callerName}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {phase === "ringing" ? "Incoming call..." : formatTime(callDuration)}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-8">
        {phase === "ringing" ? (
          <>
            <button
              onClick={decline}
              className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
            >
              <PhoneOff className="w-7 h-7 text-destructive-foreground" />
            </button>
            <button
              onClick={answer}
              className="w-16 h-16 rounded-full bg-[hsl(var(--safe))] flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity animate-bounce"
            >
              <Phone className="w-7 h-7 text-[hsl(var(--safe-foreground))]" />
            </button>
          </>
        ) : (
          <button
            onClick={hangUp}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-destructive-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FakeCall;
