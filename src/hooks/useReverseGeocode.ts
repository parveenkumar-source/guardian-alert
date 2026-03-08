import { useState, useEffect } from "react";

const cache = new Map<string, string>();

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const addr = data.address || {};
    // Build a short, readable name
    const parts: string[] = [];
    if (addr.road || addr.pedestrian || addr.neighbourhood) {
      parts.push(addr.road || addr.pedestrian || addr.neighbourhood);
    }
    if (addr.suburb || addr.city_district) {
      parts.push(addr.suburb || addr.city_district);
    }
    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village);
    }
    const name = parts.length > 0 ? parts.join(", ") : data.display_name?.split(",").slice(0, 2).join(",") || key;
    cache.set(key, name);
    return name;
  } catch {
    cache.set(key, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    return cache.get(key)!;
  }
};

/**
 * Reverse geocode an array of {lat, lng} coordinates.
 * Returns a map of "lat,lng" -> area name.
 */
export const useReverseGeocode = (coords: { lat: number; lng: number }[]) => {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (coords.length === 0) return;

    let cancelled = false;

    const resolve = async () => {
      const results: Record<string, string> = {};
      // Process sequentially to respect Nominatim rate limits (1 req/sec)
      for (const { lat, lng } of coords) {
        if (cancelled) break;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (names[key]) {
          results[key] = names[key];
          continue;
        }
        results[key] = await reverseGeocode(lat, lng);
        // Nominatim asks for max 1 request per second
        await new Promise((r) => setTimeout(r, 1100));
      }
      if (!cancelled) {
        setNames((prev) => ({ ...prev, ...results }));
      }
    };

    resolve();
    return () => { cancelled = true; };
    // Only re-run when the coord keys change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(coords.map((c) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`))]);

  const getName = (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    return names[key] || null;
  };

  return { names, getName };
};
