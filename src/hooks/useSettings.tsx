import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserSettings {
  custom_message: string;
  countdown_seconds: number;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  shake_detection: boolean;
  voice_detection: boolean;
}

const defaults: UserSettings = {
  custom_message: "",
  countdown_seconds: 10,
  notify_sms: true,
  notify_whatsapp: true,
  shake_detection: true,
  voice_detection: false,
};

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaults,
  loading: true,
  updateSettings: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(defaults);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle() as any;

      if (data) {
        setSettings({
          custom_message: data.custom_message ?? "",
          countdown_seconds: data.countdown_seconds ?? 10,
          notify_sms: data.notify_sms ?? true,
          notify_whatsapp: data.notify_whatsapp ?? true,
          shake_detection: data.shake_detection ?? true,
          voice_detection: data.voice_detection ?? false,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user) return;
      const merged = { ...settings, ...patch };
      setSettings(merged);

      const payload = { ...merged, user_id: user.id, updated_at: new Date().toISOString() } as any;

      // Upsert
      await supabase
        .from("user_settings" as any)
        .upsert(payload, { onConflict: "user_id" } as any);
    },
    [user, settings]
  );

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
