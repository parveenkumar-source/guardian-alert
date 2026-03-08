
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  trigger_type text NOT NULL DEFAULT 'manual',
  latitude double precision,
  longitude double precision,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
