import { useState } from "react";
import { Settings, Clock, MessageSquare, Bell, Vibrate, Mic, Save, Check, BellRing } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const countdownOptions = [3, 5, 7, 10, 15, 20];

const SettingsPage = () => {
  const { settings, loading, updateSettings } = useSettings();
  const { toast } = useToast();
  const push = usePushNotifications();
  const [local, setLocal] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(true);

  // Sync local state when settings load
  const [initialized, setInitialized] = useState(false);
  if (!initialized && !loading) {
    setLocal(settings);
    setInitialized(true);
  }

  const handleChange = <K extends keyof typeof local>(key: K, value: (typeof local)[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSynced(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(local);
    setSaving(false);
    setSynced(true);
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Customize your safety preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Custom Alert Message */}
          <section className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Custom Alert Message</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Add a personal message to your SOS alerts. Leave blank to use the default.
            </p>
            <textarea
              value={local.custom_message}
              onChange={(e) => handleChange("custom_message", e.target.value.slice(0, 300))}
              placeholder="e.g. Please call the police. I'm in danger."
              maxLength={300}
              rows={3}
              className="w-full rounded-lg bg-secondary/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <p className="text-xs text-muted-foreground text-right">{local.custom_message.length}/300</p>
          </section>

          {/* Countdown Duration */}
          <section className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold text-foreground">SOS Countdown</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Time before SOS is automatically sent. Shorter = faster response.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {countdownOptions.map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleChange("countdown_seconds", sec)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    local.countdown_seconds === sec
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Notifications</h2>
            </div>

            <ToggleRow
              icon={<MessageSquare className="w-4 h-4" />}
              label="SMS Alerts"
              description="Send SMS to emergency contacts"
              checked={local.notify_sms}
              onChange={(v) => handleChange("notify_sms", v)}
            />
            <ToggleRow
              icon={<MessageSquare className="w-4 h-4" />}
              label="WhatsApp Alerts"
              description="Show WhatsApp send option on SOS"
              checked={local.notify_whatsapp}
              onChange={(v) => handleChange("notify_whatsapp", v)}
            />
          </section>

          {/* Detection Preferences */}
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Vibrate className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Detection Triggers</h2>
            </div>

            <ToggleRow
              icon={<Vibrate className="w-4 h-4" />}
              label="Shake Detection"
              description="Shake your phone to trigger SOS"
              checked={local.shake_detection}
              onChange={(v) => handleChange("shake_detection", v)}
            />
            <ToggleRow
              icon={<Mic className="w-4 h-4" />}
              label="Voice Detection"
              description='Say "Help" or "Bachao" to trigger SOS'
              checked={local.voice_detection}
              onChange={(v) => handleChange("voice_detection", v)}
            />
          </section>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || synced}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : synced ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Toggle row component */
const ToggleRow = ({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-secondary"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  </div>
);

export default SettingsPage;
