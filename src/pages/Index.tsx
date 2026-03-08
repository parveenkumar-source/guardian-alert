import { useState, useCallback, useRef } from "react";
import useAutoRecording from "@/hooks/useAutoRecording";
import { Shield, MapPin, Users, Bell, Phone, Mic, MicOff, EyeOff, PhoneIncoming, KeyRound } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { generateSOSMessage } from "@/lib/contacts";
import { supabase } from "@/integrations/supabase/client";
import SOSActivation from "@/components/SOSActivation";
import SOSConfirmed from "@/components/SOSConfirmed";
import SafetyTips from "@/components/SafetyTips";
import PanicMode from "@/components/PanicMode";
import SafetyCheckin from "@/components/SafetyCheckin";
import JourneyTracker from "@/components/JourneyTracker";
import FakeCall from "@/components/FakeCall";
import useTripleTap from "@/hooks/useTripleTap";
import useProximityAlert from "@/hooks/useProximityAlert";
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
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRecording = useAutoRecording();

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
    autoRecording.start();
    logSOSTrigger(trigger, location);
  }, [canTrigger, getLocation, location, autoRecording]);

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

  useShakeDetection({
    threshold: 25,
    debounceMs: 5000,
    onShake: settings.shake_detection ? () => handleSOSTrigger("shake") : () => {},
  });

  const { listening, supported: voiceSupported } = useVoiceDetection({
    enabled: settings.voice_detection,
    onDistressDetected: () => handleSOSTrigger("voice"),
    debounceMs: 5000,
  });

  useTripleTap({
    onTripleTap: () => handleSOSTrigger("stealth"),
    enabled: sosState === "idle" && settings.triple_tap_sos,
  });

  useProximityAlert();

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

  const handleSOSConfirm = () => { autoRecording.stop(); setSosState("confirmed"); };
  const handleSOSCancel = () => { autoRecording.clear(); setSosState("idle"); };
  const handleSOSDismiss = () => { autoRecording.clear(); setSosState("idle"); };
  const handlePanicExit = () => { autoRecording.clear(); setSosState("idle"); };

  const features = [
    { icon: MapPin, title: "Live GPS Tracking", description: "Real-time location sharing with emergency contacts" },
    { icon: Users, title: "Trusted Contacts", description: "Alert family and friends instantly with one tap" },
    { icon: Bell, title: "Instant Alerts", description: "Automated SOS messages with location details" },
    { icon: Shield, title: "Secure & Private", description: "End-to-end encrypted data, your privacy matters" },
  ];

  const quickActions = [
    ...(voiceSupported !== false
      ? [{
          icon: settings.voice_detection ? Mic : MicOff,
          label: settings.voice_detection ? (listening ? "Listening…" : "Voice On") : "Voice SOS",
          onClick: toggleVoice,
          active: settings.voice_detection,
          activeClass: "bg-safe/15 text-safe border-safe/30",
          pulse: listening,
        }]
      : []),
    {
      icon: EyeOff,
      label: "Stealth",
      onClick: async () => {
        if (await canTrigger()) {
          getLocation();
          setSosState("panic");
          logSOSTrigger("stealth", location);
        }
      },
      active: false,
      activeClass: "",
      pulse: false,
    },
    {
      icon: PhoneIncoming,
      label: "Fake Call",
      onClick: () => setFakeCallActive(true),
      active: false,
      activeClass: "",
      pulse: false,
      disabled: fakeCallActive,
    },
    ...(settings.safe_word
      ? [{
          icon: KeyRound,
          label: "Safe Word",
          onClick: async () => {
            if (!user) {
              toast({ title: "Please sign in first", variant: "destructive" });
              return;
            }
            try {
              const { error } = await supabase.functions.invoke("send-sms", {
                body: { message: settings.safe_word },
              });
              toast({
                title: error ? "Failed to send" : "Safe word sent",
                description: error ? "Could not send safe word." : "Your code phrase was sent to all emergency contacts.",
                variant: error ? "destructive" : "default",
              });
            } catch {
              toast({ title: "Failed to send", variant: "destructive" });
            }
          },
          active: false,
          activeClass: "",
          pulse: false,
        }]
      : []),
  ];

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-0">
      {sosState === "activating" && <SOSActivation onCancel={handleSOSCancel} onConfirm={handleSOSConfirm} countdownSeconds={settings.countdown_seconds} />}
      {sosState === "confirmed" && <SOSConfirmed location={location} onDismiss={handleSOSDismiss} autoRecording={autoRecording.result} />}
      {sosState === "panic" && <PanicMode location={location} onExit={handlePanicExit} />}
      {fakeCallActive && (
        <FakeCall callerName={settings.fake_call_name || "Mom"} delay={settings.fake_call_delay || 5} onEnd={() => setFakeCallActive(false)} key="fake-call" />
      )}

      {/* Hero SOS Section */}
      <section className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/4 w-[200px] h-[200px] bg-primary/3 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full page-transition">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            AI-Powered Safety System
          </div>

          {/* Headline */}
          <div className="text-center space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
              Your Safety,<br />
              <span className="text-gradient">One Tap Away</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
              Instant SOS alerts with live location to your trusted contacts.
            </p>
          </div>

          {/* SOS Button */}
          <div className="relative my-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 sos-ring" />
            <div className="absolute inset-0 rounded-full bg-primary/15 sos-ring" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-0 rounded-full bg-primary/10 sos-ring" style={{ animationDelay: "1s" }} />
            <button
              onClick={() => handleSOSTrigger("manual")}
              onPointerDown={handleSOSPointerDown}
              onPointerUp={handleSOSPointerUp}
              onPointerLeave={handleSOSPointerUp}
              className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-display text-3xl font-bold shadow-[0_0_60px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_80px_hsl(var(--primary)/0.6)] sos-pulse transition-all duration-300 active:scale-95"
            >
              SOS
            </button>
          </div>
          <p className="text-muted-foreground text-[11px] tracking-wide">TAP FOR SOS · LONG PRESS FOR STEALTH</p>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  action.active
                    ? action.activeClass
                    : "bg-secondary/80 text-muted-foreground border border-border/50 hover:text-foreground hover:bg-secondary hover:border-border"
                } disabled:opacity-40`}
              >
                <action.icon className={`w-3.5 h-3.5 ${action.pulse ? "animate-pulse" : ""}`} />
                {action.label}
              </button>
            ))}
          </div>

          {/* Quick Links */}
          <div className="flex gap-3 w-full max-w-xs">
            <Link to="/contacts" className="flex-1 glass-card-hover p-3.5 flex flex-col items-center gap-2 text-center">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">Contacts</span>
            </Link>
            <Link to="/helplines" className="flex-1 glass-card-hover p-3.5 flex flex-col items-center gap-2 text-center">
              <div className="w-9 h-9 rounded-lg bg-safe/10 flex items-center justify-center">
                <Phone className="w-4.5 h-4.5 text-safe" />
              </div>
              <span className="text-xs font-medium text-foreground">Helplines</span>
            </Link>
          </div>

          {/* Safety Check-in & Journey */}
          <div className="w-full max-w-xs space-y-3">
            <SafetyCheckin />
            <JourneyTracker />
          </div>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-md">
          <SafetyTips location={location} />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Safety Features</h2>
            <p className="text-muted-foreground text-sm">Built with security and speed in mind</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <div key={feature.title} className="glass-card-hover p-5 flex items-start gap-4 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "forwards" }}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/30">
        <div className="container mx-auto text-center space-y-1">
          <p className="text-xs text-muted-foreground">Raksha — AI-Based Women Safety & Emergency Alert System</p>
          <p className="text-xs text-muted-foreground">In case of emergency, always call <span className="text-primary font-semibold">112</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
