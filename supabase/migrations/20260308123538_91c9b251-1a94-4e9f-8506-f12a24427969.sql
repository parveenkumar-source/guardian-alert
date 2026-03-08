
-- Emergency Info Card table
CREATE TABLE public.emergency_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  blood_type text,
  allergies text,
  medical_conditions text,
  medications text,
  emergency_notes text,
  date_of_birth date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emergency info" ON public.emergency_info FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emergency info" ON public.emergency_info FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emergency info" ON public.emergency_info FOR UPDATE USING (auth.uid() = user_id);

-- Safe Zones table
CREATE TABLE public.safe_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.safe_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own safe zones" ON public.safe_zones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own safe zones" ON public.safe_zones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own safe zones" ON public.safe_zones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own safe zones" ON public.safe_zones FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger for emergency_info
CREATE TRIGGER update_emergency_info_updated_at BEFORE UPDATE ON public.emergency_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
