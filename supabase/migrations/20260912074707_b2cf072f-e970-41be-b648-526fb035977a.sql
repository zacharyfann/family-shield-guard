CREATE TABLE public.institutional_directory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_name text NOT NULL,
 verified_phone text NOT NULL,
 verified_domain text NOT NULL UNIQUE,
 safe_portal_url text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institutional_directory TO anon, authenticated;
GRANT ALL ON public.institutional_directory TO service_role;
ALTER TABLE public.institutional_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read official institutions" ON public.institutional_directory FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.institutional_directory (brand_name, verified_domain, verified_phone, safe_portal_url) VALUES
('USPS', 'usps.com', '1-800-275-8777', 'https://tools.usps.com'),
('Chase Bank', 'chase.com', '1-800-935-9935', 'https://www.chase.com'),
('Amazon', 'amazon.com', '1-888-280-4331', 'https://www.amazon.com/your-account'),
('FedEx', 'fedex.com', '1-800-463-3339', 'https://www.fedex.com/tracking'),
('IRS', 'irs.gov', '1-800-829-1040', 'https://www.irs.gov');