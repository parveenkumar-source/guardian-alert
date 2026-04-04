import { useState, useCallback, useRef } from "react";
import useAutoRecording from "@/hooks/useAutoRecording";
import { Shield, MapPin, Users, Bell, Phone, Mic, MicOff, EyeOff, PhoneIncoming, KeyRound, Calculator } from "lucide-react";
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
import EmergencyInfoCard from "@/components/EmergencyInfoCard";
import SafeZones from "@/components/SafeZones";
import WalkBuddy from "@/components/WalkBuddy";
import SafetyScoreCard from "@/components/SafetyScoreCard";
import DisguiseMode from "@/components/DisguiseMode";
import useTripleTap from "@/hooks/useTripleTap";
import useProximityAlert from "@/hooks/useProximityAlert";
import useBatteryAlert from "@/hooks/useBatteryAlert";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import useShakeDetection from "@/hooks/useShakeDetection";
import useVoiceDetection from "@/hooks/useVoiceDetection";
import { triggerVoiceSOS } from "@/lib/voiceSOSAlert";
import { logSOSTrigger, TriggerType } from "@/lib/activityLog";
import { useSettings } from "@/hooks/useSettings";
import { useLanguage } from "@/hooks/useLanguage";

const Index = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useLanguage();
  const [sosState, setSosState] = useState<"idle" | "activating" | "confirmed" | "panic">("idle");
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const [disguiseActive, setDisguiseActive] = useState(false);
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRecording = useAutoRecording();
  useBatteryAlert();

  const canTrigger = useCallback(async () => {
    if (sosState !== "idle") return false;
    if (!user) {
      toast({ title: t("home_sign_in_first"), description: t("home_sign_in_sos"), variant: "destructive" });
      return false;
    }
    const { count } = await supabase.from("emergency_contacts").select("id", { count: "exact", head: true });
    if (!count || count === 0) {
      toast({ title: t("home_no_contacts"), description: t("home_no_contacts_desc"), variant: "destructive" });
      return false;
    }
    return true;
  }, [sosState, user, toast, t]);

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
        title: t("home_voice_enabled"),
        description: t("home_voice_enabled_desc"),
      });
    }
    await updateSettings({ voice_detection: newVal });
  };

  const handleSOSConfirm = () => { autoRecording.stop(); setSosState("confirmed"); };
  const handleSOSCancel = () => { autoRecording.clear(); setSosState("idle"); };
  const handleSOSDismiss = () => { autoRecording.clear(); setSosState("idle"); };
  const handlePanicExit = () => { autoRecording.clear(); setSosState("idle"); };

  const features = [
    { icon: MapPin, title: t("home_feature_gps_title"), description: t("home_feature_gps_desc") },
    { icon: Users, title: t("home_feature_contacts_title"), description: t("home_feature_contacts_desc") },
    { icon: Bell, title: t("home_feature_alerts_title"), description: t("home_feature_alerts_desc") },
    { icon: Shield, title: t("home_feature_secure_title"), description: t("home_feature_secure_desc") },
  ];

  const quickActions = [
    ...(voiceSupported !== false
      ? [{
          icon: settings.voice_detection ? Mic : MicOff,
          label: settings.voice_detection ? (listening ? t("home_listening") : t("home_voice_on")) : t("home_voice_sos"),
          onClick: toggleVoice,
          active: settings.voice_detection,
          activeClass: "bg-safe/15 text-safe border-safe/30",
          pulse: listening,
        }]
      : []),
    {
      icon: EyeOff,
      label: t("home_stealth"),
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
      label: t("home_fake_call"),
      onClick: () => setFakeCallActive(true),
      active: false,
      activeClass: "",
      pulse: false,
      disabled: fakeCallActive,
    },
    {
      icon: Calculator,
      label: "Disguise",
      onClick: () => setDisguiseActive(true),
      active: false,
      activeClass: "",
      pulse: false,
    },
    ...(settings.safe_word
      ? [{
          icon: KeyRound,
          label: t("home_safe_word"),
          onClick: async () => {
            if (!user) {
              toast({ title: t("home_sign_in_first"), variant: "destructive" });
              return;
            }
            try {
              const { error } = await supabase.functions.invoke("send-sms", {
                body: { message: settings.safe_word },
              });
              toast({
                title: error ? t("home_failed_to_send") : t("home_safe_word_sent"),
                description: error ? t("home_could_not_send") : t("home_safe_word_sent_desc"),
                variant: error ? "destructive" : "default",
              });
            } catch {
              toast({ title: t("home_failed_to_send"), variant: "destructive" });
            }
          },
          active: false,
          activeClass: "",
          pulse: false,
        }]
      : []),
  ];

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-0">
      {sosState === "activating" && <SOSActivation onCancel={handleSOSCancel} onConfirm={handleSOSConfirm} countdownSeconds={settings.countdown_seconds} />}
      {sosState === "confirmed" && <SOSConfirmed location={location} onDismiss={handleSOSDismiss} autoRecording={autoRecording.result} />}
      {sosState === "panic" && <PanicMode location={location} onExit={handlePanicExit} />}
      {fakeCallActive && (
        <FakeCall callerName={settings.fake_call_name || "Mom"} delay={settings.fake_call_delay || 5} onEnd={() => setFakeCallActive(false)} key="fake-call" />
      )}
      {disguiseActive && <DisguiseMode onExit={() => setDisguiseActive(false)} />}

      {/* Hero SOS Section */}
      <section className="relative flex flex-col items-center justify-center px-5 pt-8 pb-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm page-transition">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wide uppercase">
            <Shield className="w-3 h-3" />
            {t("home_badge")}
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
              {t("home_headline_1")}<br />
              <span className="text-gradient">{t("home_headline_2")}</span>
            </h1>
            <p className="text-muted-foreground text-[13px] sm:text-base max-w-[280px] mx-auto leading-relaxed">
              {t("home_subtitle")}
            </p>
          </div>

          {/* SOS Button */}
          <div className="relative my-2">
            <div className="absolute inset-0 rounded-full bg-primary/20 sos-ring" />
            <div className="absolute inset-0 rounded-full bg-primary/15 sos-ring" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-0 rounded-full bg-primary/10 sos-ring" style={{ animationDelay: "1s" }} />
            <button
              onClick={() => handleSOSTrigger("manual")}
              onPointerDown={handleSOSPointerDown}
              onPointerUp={handleSOSPointerUp}
              onPointerLeave={handleSOSPointerUp}
              className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-display text-3xl font-bold shadow-[0_0_60px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_80px_hsl(var(--primary)/0.6)] sos-pulse transition-all duration-300 active:scale-95"
            >
              SOS
            </button>
          </div>
          <p className="text-muted-foreground text-[10px] tracking-widest uppercase">{t("home_sos_hint")}</p>

          {/* Quick Actions — compact grid */}
          <div className="grid grid-cols-4 gap-2 w-full">
            {quickActions.slice(0, 4).map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                  action.active
                    ? action.activeClass
                    : "bg-secondary/60 text-muted-foreground border border-border/40 hover:text-foreground hover:bg-secondary"
                } disabled:opacity-40`}
              >
                <action.icon className={`w-4 h-4 ${action.pulse ? "animate-pulse" : ""}`} />
                {action.label}
              </button>
            ))}
          </div>
          {quickActions.length > 4 && (
            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              {quickActions.slice(4).map((action, i) => (
                <button
                  key={i + 4}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium transition-all duration-200 ${
                    action.active
                      ? action.activeClass
                      : "bg-secondary/60 text-muted-foreground border border-border/40 hover:text-foreground hover:bg-secondary"
                  } disabled:opacity-40`}
                >
                  <action.icon className={`w-3.5 h-3.5 ${action.pulse ? "animate-pulse" : ""}`} />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <Link to="/contacts" className="glass-card-hover p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">{t("home_contacts")}</span>
            </Link>
            <Link to="/helplines" className="glass-card-hover p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-safe/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-safe" />
              </div>
              <span className="text-xs font-semibold text-foreground">{t("home_helplines")}</span>
            </Link>
          </div>

          {/* Widget Cards */}
          <div className="w-full space-y-2.5">
            <SafetyCheckin />
            <JourneyTracker />
            <WalkBuddy />
            <SafetyScoreCard />
            <EmergencyInfoCard />
            <SafeZones />
          </div>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="py-8 px-5">
        <div className="max-w-sm mx-auto">
          <SafetyTips location={location} />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-10 px-5">
        <div className="max-w-sm sm:max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-xl sm:text-3xl font-bold text-foreground mb-1">{t("home_safety_features")}</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">{t("home_features_subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
            {features.map((feature, i) => (
              <div key={feature.title} className="glass-card-hover p-4 flex flex-col gap-2.5 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "forwards" }}>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-[13px] mb-0.5">{feature.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-5 px-5 border-t border-border/20">
        <div className="text-center space-y-0.5">
          <p className="text-[11px] text-muted-foreground">Raksha — {t("app_tagline")}</p>
          <p className="text-[11px] text-muted-foreground">{t("home_emergency_call")} <span className="text-primary font-semibold">112</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
