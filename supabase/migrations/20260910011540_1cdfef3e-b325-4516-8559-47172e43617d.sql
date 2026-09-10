-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  has_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- submissions: start fresh, owned by users
DROP TABLE IF EXISTS public.submissions;
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  raw_text text,
  image_url text,
  category text NOT NULL DEFAULT 'Other',
  risk_score text,
  domain_data jsonb,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own submissions" ON public.submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX submissions_user_created_idx ON public.submissions (user_id, created_at DESC);

-- caregiver settings
CREATE TABLE public.caregiver_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  caregiver_email text,
  alert_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_settings TO authenticated;
GRANT ALL ON public.caregiver_settings TO service_role;
ALTER TABLE public.caregiver_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own caregiver settings" ON public.caregiver_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_caregiver_settings_updated_at BEFORE UPDATE ON public.caregiver_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();