import { supabase } from "@/integrations/supabase/client";

export type TriggerType = "manual" | "shake" | "voice" | "stealth";

export async function logSOSTrigger(
  triggerType: TriggerType,
  location: { latitude: number; longitude: number } | null
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_logs" as any).insert({
    user_id: user.id,
    trigger_type: triggerType,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    message: `SOS triggered via ${triggerType}`,
  } as any);
}
