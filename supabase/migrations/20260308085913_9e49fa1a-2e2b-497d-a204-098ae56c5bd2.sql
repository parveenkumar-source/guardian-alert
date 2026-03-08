
CREATE TABLE public.journeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  destination_name text NOT NULL DEFAULT '',
  destination_lat double precision,
  destination_lng double precision,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  UNIQUE(share_token)
);

CREATE TABLE public.journey_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_points ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can view own journeys" ON public.journeys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journeys" ON public.journeys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journeys" ON public.journeys FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Journey points: owner can insert/view
CREATE POLICY "Users can insert own journey points" ON public.journey_points FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_id AND user_id = auth.uid()));
CREATE POLICY "Users can view own journey points" ON public.journey_points FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_id AND user_id = auth.uid()));

-- Public read for shared journeys via share_token (anon access)
CREATE POLICY "Public can view shared journeys" ON public.journeys FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view shared journey points" ON public.journey_points FOR SELECT TO anon USING (true);

-- Enable realtime for journey_points
ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_points;
