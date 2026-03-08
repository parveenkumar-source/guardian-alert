ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS fake_call_name text DEFAULT 'Mom';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS fake_call_delay integer DEFAULT 5;