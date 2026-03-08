
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.safety_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  alert_sent boolean NOT NULL DEFAULT false,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.safety_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.safety_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.safety_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
