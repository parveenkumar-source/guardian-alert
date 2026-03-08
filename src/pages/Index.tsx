import { useState, useCallback, useRef } from "react";
import { Shield, MapPin, Users, Bell, ChevronRight, Phone, Mic, MicOff, EyeOff } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { generateSOSMessage } from "@/lib/contacts";
import { supabase } from "@/integrations/supabase/client";
import SOSActivation from "@/components/SOSActivation";
import SOSConfirmed from "@/components/SOSConfirmed";
import SafetyTips from "@/components/SafetyTips";
import PanicMode from "@/components/PanicMode";
import SafetyCheckin from "@/components/SafetyCheckin";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import useShakeDetection from "@/hooks/useShakeDetection";
import useVoiceDetection from "@/hooks/useVoiceDetection";
import { logSOSTrigger, TriggerType } from "@/lib/activityLog";
import { useSettings } from "@/hooks/useSettings";

const Index = () => {
  const { settings, updateSettings } = useSettings();
  const [sosState, setSosState] = useState<"idle" | "activating" | "confirmed" | "panic">("idle");
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canTrigger = useCallback(async () => {
    if (sosState !== "idle") return false;
    if (!user) {
      toast({ title: "Please sign in first", description: "You need to be logged in to use SOS.", variant: "destructive" });
      return false;
    }
    const { count } = await supabase.from("emergency_contacts").select("id", { count: "exact", head: true });
    if (!count || count === 0) {
      toast({ title: "No Emergency Contacts", description: "Please add at least one emergency contact first.", variant: "destructive" });
      return false;
    }
    return true;
  }, [sosState, user, toast]);

  const handleSOSTrigger = useCallback(async (trigger: TriggerType = "manual") => {
    if (!(await canTrigger())) return;
    getLocation();
    setSosState("activating");
    logSOSTrigger(trigger, location);
  }, [canTrigger, getLocation, location]);

  // Long press SOS button → panic mode
  const handleSOSPointerDown = () => {
    longPressTimer.current = setTimeout(async () => {
      if (!(await canTrigger())) return;
      getLocation();
      setSosState("panic");
      logSOSTrigger("stealth", location);
    }, 1500);
  };

  const handleSOSPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Shake detection — respects settings
  useShakeDetection({
    threshold: 25,
    debounceMs: 5000,
    onShake: settings.shake_detection ? () => handleSOSTrigger("shake") : () => {},
  });

  // Voice detection — respects settings
  const { listening, supported: voiceSupported } = useVoiceDetection({
    enabled: settings.voice_detection,
    onDistressDetected: () => handleSOSTrigger("voice"),
    debounceMs: 5000,
  });

  const toggleVoice = async () => {
    const newVal = !settings.voice_detection;
    if (newVal) {
      toast({
        title: "Voice Detection Enabled",
        description: 'Say "Help", "Bachao", or "SOS" to trigger an alert.',
      });
    }
    await updateSettings({ voice_detection: newVal });
  };

  const handleSOSConfirm = () => setSosState("confirmed");
  const handleSOSCancel = () => setSosState("idle");
  const handleSOSDismiss = () => setSosState("idle");
  const handlePanicExit = () => setSosState("idle");

  const features = [
    { icon: MapPin, title: "Live GPS Tracking", description: "Real-time location sharing with emergency contacts" },
    { icon: Users, title: "Trusted Contacts", description: "Alert family and friends instantly with one tap" },
    { icon: Bell, title: "Instant Alerts", description: "Automated SOS messages with location details" },
    { icon: Shield, title: "Secure & Private", description: "End-to-end encrypted data, your privacy matters" },
  ];

  return (
    <div className="min-h-screen pt-16">
      {sosState === "activating" && <SOSActivation onCancel={handleSOSCancel} onConfirm={handleSOSConfirm} countdownSeconds={settings.countdown_seconds} />}
      {sosState === "confirmed" && <SOSConfirmed location={location} onDismiss={handleSOSDismiss} />}
      {sosState === "panic" && <PanicMode location={location} onExit={handlePanicExit} />}

      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg w-full opacity-0 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" />
              AI-Powered Safety System
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Your Safety,<br />
              <span className="text-gradient">One Tap Away</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-sm mx-auto">
              Instant SOS alerts with live location to your trusted contacts and authorities.
            </p>
          </div>

          <div className="relative mt-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 sos-ring" />
            <div className="absolute inset-0 rounded-full bg-primary/15 sos-ring" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-0 rounded-full bg-primary/10 sos-ring" style={{ animationDelay: "1s" }} />
            <button
              onClick={() => handleSOSTrigger("manual")}
              onPointerDown={handleSOSPointerDown}
              onPointerUp={handleSOSPointerUp}
              onPointerLeave={handleSOSPointerUp}
              className="relative w-40 h-40 rounded-full bg-primary text-primary-foreground font-display text-3xl font-bold shadow-[0_0_60px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_80px_hsl(var(--primary)/0.6)] sos-pulse transition-shadow duration-300 active:scale-95"
            >
              SOS
            </button>
          </div>

          <p className="text-muted-foreground text-xs">Tap for SOS · Long press for stealth mode</p>

          {/* Voice Detection Toggle & Panic Mode Button */}
          <div className="flex items-center gap-2">
            {voiceSupported !== false && (
              <button
                onClick={toggleVoice}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  settings.voice_detection
                    ? "bg-safe/15 text-safe border border-safe/30"
                    : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {settings.voice_detection ? (
                  <>
                    <Mic className={`w-3.5 h-3.5 ${listening ? "animate-pulse" : ""}`} />
                    Voice {listening && "· Listening"}
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    Voice SOS
                  </>
                )}
              </button>
            )}

            <button
              onClick={async () => {
                if (await canTrigger()) {
                  getLocation();
                  setSosState("panic");
                  logSOSTrigger("stealth", location);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-all"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Stealth
            </button>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <Link to="/contacts" className="flex-1 glass-card-hover p-3 flex flex-col items-center gap-1.5 text-center">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground">Contacts</span>
            </Link>
            <Link to="/helplines" className="flex-1 glass-card-hover p-3 flex flex-col items-center gap-1.5 text-center">
              <Phone className="w-5 h-5 text-safe" />
              <span className="text-xs font-medium text-foreground">Helplines</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-lg">
          <SafetyTips location={location} />
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Safety Features</h2>
            <p className="text-muted-foreground">Built with security and speed in mind</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div key={feature.title} className="glass-card-hover p-6 flex items-start gap-4 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "forwards" }}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>Raksha — AI-Based Women Safety & Emergency Alert System</p>
          <p className="mt-1">In case of emergency, always call <span className="text-primary font-medium">112</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
