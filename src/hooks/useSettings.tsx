import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export interface UserSettings {
  custom_message: string;
  countdown_seconds: number;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  shake_detection: boolean;
  voice_detection: boolean;
  fake_call_name: string;
  fake_call_delay: number;
  triple_tap_sos: boolean;
  proximity_alert: boolean;
  safe_word: string;
}

const defaults: UserSettings = {
  custom_message: "",
  countdown_seconds: 10,
  notify_sms: true,
  notify_whatsapp: true,
  shake_detection: true,
  voice_detection: false,
  fake_call_name: "Mom",
  fake_call_delay: 5,
  triple_tap_sos: true,
  proximity_alert: false,
  safe_word: "",
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

  const { data: settingsData, isLoading: loading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_settings" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle() as any;
      return data ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!user) {
      setSettings(defaults);
      return;
    }
    if (settingsData) {
      setSettings({
        custom_message: settingsData.custom_message ?? "",
        countdown_seconds: settingsData.countdown_seconds ?? 10,
        notify_sms: settingsData.notify_sms ?? true,
        notify_whatsapp: settingsData.notify_whatsapp ?? true,
        shake_detection: settingsData.shake_detection ?? true,
        voice_detection: settingsData.voice_detection ?? false,
        fake_call_name: settingsData.fake_call_name ?? "Mom",
        fake_call_delay: settingsData.fake_call_delay ?? 5,
        triple_tap_sos: settingsData.triple_tap_sos ?? true,
        proximity_alert: settingsData.proximity_alert ?? false,
        safe_word: settingsData.safe_word ?? "",
      });
    }
  }, [user, settingsData]);

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
