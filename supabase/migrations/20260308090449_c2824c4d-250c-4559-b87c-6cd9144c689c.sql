
CREATE TABLE public.safety_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  severity text NOT NULL DEFAULT 'medium',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  upvotes integer NOT NULL DEFAULT 0
);

ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view all reports (community feature)
CREATE POLICY "Authenticated users can view all reports"
ON public.safety_reports FOR SELECT TO authenticated
USING (true);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON public.safety_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update own reports
CREATE POLICY "Users can update own reports"
ON public.safety_reports FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own reports
CREATE POLICY "Users can delete own reports"
ON public.safety_reports FOR DELETE TO authenticated
USING (auth.uid() = user_id);
