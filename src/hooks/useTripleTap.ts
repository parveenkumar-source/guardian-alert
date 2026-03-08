import { useEffect, useRef, useCallback } from "react";

interface UseTripleTapOptions {
  onTripleTap: () => void;
  maxInterval?: number; // ms between taps (default 400)
  enabled?: boolean;
}

const useTripleTap = ({ onTripleTap, maxInterval = 400, enabled = true }: UseTripleTapOptions) => {
  const tapsRef = useRef<number[]>([]);
  const callbackRef = useRef(onTripleTap);
  callbackRef.current = onTripleTap;

  const handleTap = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    const taps = tapsRef.current;

    // Remove stale taps
    while (taps.length > 0 && now - taps[0] > maxInterval * 3) {
      taps.shift();
    }

    taps.push(now);

    if (taps.length >= 3) {
      const [first, , third] = taps.slice(-3);
      if (third - first <= maxInterval * 2) {
        tapsRef.current = [];
        callbackRef.current();
      }
    }
  }, [enabled, maxInterval]);

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: TouchEvent | MouseEvent) => {
      // Only count taps on the document background, not interactive elements
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select, [role='button']")) return;
      handleTap();
    };

    document.addEventListener("touchstart", listener, { passive: true });
    document.addEventListener("mousedown", listener);

    return () => {
      document.removeEventListener("touchstart", listener);
      document.removeEventListener("mousedown", listener);
    };
  }, [enabled, handleTap]);
};

export default useTripleTap;
