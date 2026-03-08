import { useEffect, useRef, useCallback } from "react";

interface UseShakeDetectionOptions {
  threshold?: number; // acceleration threshold (m/s²)
  debounceMs?: number; // cooldown between shake triggers
  onShake: () => void;
}

const useShakeDetection = ({
  threshold = 25,
  debounceMs = 3000,
  onShake,
}: UseShakeDetectionOptions) => {
  const lastTrigger = useRef(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const shakeCount = useRef(0);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel || accel.x == null || accel.y == null || accel.z == null) return;

      const deltaX = Math.abs(accel.x - lastAccel.current.x);
      const deltaY = Math.abs(accel.y - lastAccel.current.y);
      const deltaZ = Math.abs(accel.z - lastAccel.current.z);

      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };

      const totalDelta = deltaX + deltaY + deltaZ;

      if (totalDelta > threshold) {
        shakeCount.current += 1;

        // Reset shake count after 1.5s of no shakes
        if (shakeTimer.current) clearTimeout(shakeTimer.current);
        shakeTimer.current = setTimeout(() => {
          shakeCount.current = 0;
        }, 1500);

        // Require 3 strong shakes within the window to trigger
        if (shakeCount.current >= 3) {
          const now = Date.now();
          if (now - lastTrigger.current > debounceMs) {
            lastTrigger.current = now;
            shakeCount.current = 0;
            onShake();
          }
        }
      }
    },
    [threshold, debounceMs, onShake]
  );

  useEffect(() => {
    // Request permission on iOS 13+
    const requestPermission = async () => {
      if (
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== "granted") return;
        } catch {
          return;
        }
      }
      window.addEventListener("devicemotion", handleMotion);
    };

    requestPermission();

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, [handleMotion]);
};

export default useShakeDetection;
