import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: journey, error } = await supabase
    .from("journeys")
    .select("*, journey_points(*)")
    .eq("share_token", token)
    .order("recorded_at", { referencedTable: "journey_points", ascending: true })
    .maybeSingle();

  if (error || !journey) {
    return new Response(JSON.stringify({ error: "Journey not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If request accepts JSON, return data
  const accept = req.headers.get("Accept") || "";
  if (accept.includes("application/json")) {
    return new Response(JSON.stringify(journey), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Otherwise return an HTML tracking page
  const points = journey.journey_points || [];
  const lastPoint = points[points.length - 1];
  const centerLat = lastPoint?.latitude || 20.5937;
  const centerLng = lastPoint?.longitude || 78.9629;

  const polyline = points.map((p: any) => `[${p.latitude}, ${p.longitude}]`).join(",");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Raksha — Live Journey Tracking</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #0a0a0f; color: #e2e2e8; }
    #map { width: 100%; height: 60vh; }
    .header { padding: 1rem; text-align: center; border-bottom: 1px solid #222; }
    .header h1 { font-size: 1.25rem; color: #dc2626; }
    .header p { font-size: 0.75rem; color: #888; margin-top: 0.25rem; }
    .info { padding: 1rem; text-align: center; }
    .info .status { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.875rem; font-weight: 600; }
    .active { background: rgba(34,197,94,0.15); color: #22c55e; }
    .ended { background: rgba(100,100,120,0.15); color: #888; }
    .dest { font-size: 0.875rem; color: #aaa; margin-top: 0.5rem; }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Raksha Live Tracking</h1>
    <p>Shared journey — ${journey.destination_name || "Unknown destination"}</p>
  </div>
  <div id="map"></div>
  <div class="info">
    <div class="status ${journey.is_active ? "active" : "ended"}">
      ${journey.is_active ? '<div class="pulse"></div> Journey in progress' : '✓ Journey completed'}
    </div>
    ${journey.destination_name ? `<p class="dest">📍 Destination: ${journey.destination_name}</p>` : ""}
  </div>
  <script>
    const map = L.map('map').setView([${centerLat}, ${centerLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const points = [${polyline}];
    if (points.length > 0) {
      const polyline = L.polyline(points, { color: '#dc2626', weight: 4, opacity: 0.8 }).addTo(map);
      
      // Start marker
      L.circleMarker(points[0], { radius: 8, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 })
        .bindPopup('Start').addTo(map);
      
      // Current position marker
      const last = points[points.length - 1];
      L.circleMarker(last, { radius: 10, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 })
        .bindPopup('Current Location').addTo(map);

      ${journey.destination_lat && journey.destination_lng ? `
      L.marker([${journey.destination_lat}, ${journey.destination_lng}])
        .bindPopup('Destination: ${(journey.destination_name || "").replace(/'/g, "\\'")}')
        .addTo(map);
      ` : ""}

      map.fitBounds(polyline.getBounds().pad(0.1));
    }

    // Auto-refresh if journey is active
    ${journey.is_active ? `setTimeout(() => location.reload(), 15000);` : ""}
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
