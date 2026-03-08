
-- Evidence recordings table
CREATE TABLE public.evidence_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sos_trigger_type text NOT NULL DEFAULT 'manual',
  file_type text NOT NULL DEFAULT 'audio',
  file_path text NOT NULL,
  latitude double precision,
  longitude double precision,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own evidence" ON public.evidence_recordings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own evidence" ON public.evidence_recordings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence" ON public.evidence_recordings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
