CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT,
  category TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'analyzed',
  risk_level TEXT,
  feedback_notes TEXT
);
GRANT INSERT ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a message for analysis" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (true);