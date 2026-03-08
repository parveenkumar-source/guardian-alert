import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateSOSMessage } from "@/lib/contacts";

interface PanicModeProps {
  location: { latitude: number; longitude: number } | null;
  onExit: () => void;
}

const PanicMode = ({ location, onExit }: PanicModeProps) => {
  const [time, setTime] = useState(new Date());
  const [alertStatus, setAlertStatus] = useState<"sending" | "sent" | "failed">("sending");
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Silently send alerts on mount
  useEffect(() => {
    const sendSilentAlert = async () => {
      try {
        const message = location
          ? generateSOSMessage(location.latitude, location.longitude)
          : "🚨 EMERGENCY SOS ALERT! I need immediate help!";

        const { error } = await supabase.functions.invoke("send-sms", {
          body: { message },
        });

        if (error) throw error;
        setAlertStatus("sent");
      } catch (err) {
        console.error("Silent alert error:", err);
        setAlertStatus("failed");
      }
    };

    sendSilentAlert();
  }, [location]);

  // Triple-tap to exit
  const handleTap = () => {
    tapCount.current += 1;

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 800);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      onExit();
    }
  };

  // Prevent back navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const formattedTime = `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")}`;
  const ampm = hours >= 12 ? "PM" : "AM";
  const dateStr = time.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      onClick={handleTap}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center select-none cursor-default"
      style={{ touchAction: "none" }}
    >
      {/* Fake lock screen appearance */}
      <div className="flex flex-col items-center gap-2 opacity-30">
        <p className="text-white/60 text-sm tracking-wider">{dateStr}</p>
        <p className="text-white font-light text-7xl tracking-tight">
          {formattedTime}
          <span className="text-2xl ml-1">{ampm}</span>
        </p>
      </div>

      {/* Invisible status indicator — only visible as a tiny dot */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            alertStatus === "sending"
              ? "bg-white/10 animate-pulse"
              : alertStatus === "sent"
              ? "bg-white/5"
              : "bg-white/5"
          }`}
        />
      </div>

      {/* Hidden exit hint — only shows after first tap */}
      <p className="absolute bottom-4 text-white/0 text-[8px] select-none pointer-events-none">
        Triple tap to exit
      </p>
    </div>
  );
};

export default PanicMode;
