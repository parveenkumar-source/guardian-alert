import { useState } from "react";
import { MapPin, Clock, Shield, AlertTriangle, Navigation, Star, Loader2, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Route {
  name: string;
  safetyRating: number;
  estimatedTime: string;
  transportMode: string;
  highlights: string[];
  cautions: string[];
  description: string;
}

const SafeRoutes = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  };

  const handleSearch = async () => {
    if (!origin.trim() || !destination.trim()) {
      toast({ title: "Please enter both origin and destination", variant: "destructive" });
      return;
    }

    setLoading(true);
    setRoutes([]);
    try {
      const { data, error } = await supabase.functions.invoke("safe-routes", {
        body: { origin: origin.trim(), destination: destination.trim(), timeOfDay: getTimeContext() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRoutes(data?.routes || []);
      if (!data?.routes?.length) {
        toast({ title: "No routes found. Try different locations.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Safe routes error:", err);
      toast({ title: "Failed to get route suggestions", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
    ));

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-12 px-4 page-transition">
      <div className="container mx-auto max-w-lg">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Safe Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered route suggestions prioritizing your safety</p>
        </div>

        {/* Search Form */}
        <div className="glass-card p-5 space-y-4 mb-6">
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-safe border-2 border-safe/30" />
              <input
                type="text"
                placeholder="Starting point (e.g., Connaught Place)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary/30" />
              <input
                type="text"
                placeholder="Destination (e.g., India Gate)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finding safe routes...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                Find Safe Routes
              </>
            )}
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded-full w-16" />
                  <div className="h-5 bg-muted rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Route Results */}
        {!loading && routes.length > 0 && (
          <div className="space-y-4">
            {routes.map((route, i) => (
              <div
                key={i}
                className="glass-card-hover p-5 space-y-3 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.12}s`, animationFillMode: "forwards" }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{route.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{route.description}</p>
                  </div>
                  {i === 0 && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-safe/15 text-safe text-[10px] font-semibold uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="flex">{renderStars(route.safetyRating)}</div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {route.estimatedTime}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Car className="w-3.5 h-3.5" />
                    {route.transportMode}
                  </div>
                </div>

                {/* Highlights */}
                {route.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {route.highlights.map((h, j) => (
                      <span key={j} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-safe/10 text-safe text-[11px] font-medium">
                        <Shield className="w-3 h-3" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cautions */}
                {route.cautions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {route.cautions.map((c, j) => (
                      <span key={j} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 text-warning text-[11px] font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Google Maps link */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${route.transportMode === "walking" ? "walking" : "driving"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                >
                  <MapPin className="w-3 h-3" />
                  Open in Google Maps →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && routes.length === 0 && (
          <div className="text-center py-12">
            <Navigation className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Enter your origin and destination to get AI-powered safe route suggestions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SafeRoutes;
