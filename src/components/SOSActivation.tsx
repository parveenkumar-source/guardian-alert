import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface SOSActivationProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const SOSActivation = ({ onCancel, onConfirm }: SOSActivationProps) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      onConfirm();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onConfirm]);

  const progress = ((10 - countdown) / 10) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full">
        {/* Countdown circle */}
        <div className="relative w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="4"
            />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-6xl font-bold text-primary">{countdown}</span>
            <span className="text-sm text-muted-foreground mt-1">seconds</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground">SOS Activating...</h2>
          <p className="text-muted-foreground text-sm">
            Alert will be sent to your emergency contacts with your live location.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-8 py-3 rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
        >
          <X className="w-5 h-5" />
          Cancel SOS
        </button>
      </div>
    </div>
  );
};

export default SOSActivation;
