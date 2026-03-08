
CREATE TABLE public.report_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.safety_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type smallint NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all votes"
ON public.report_votes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own votes"
ON public.report_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
ON public.report_votes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
ON public.report_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);
