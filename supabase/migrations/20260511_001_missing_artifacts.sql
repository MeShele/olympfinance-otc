-- =============================================================================
-- Fill in the artifacts that were missed in the initial OTC bundle.
-- =============================================================================
-- Frontend was hitting 404 on REST + RPC because these tables/buckets/
-- functions exist in the upstream platform schema but never made it
-- into `init-otc-db.sql`. Idempotent: every CREATE is `IF NOT EXISTS`
-- and storage inserts go through `ON CONFLICT DO NOTHING`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Branding columns on company_settings (logo/colors/socials)
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_telegram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_twitter text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_instagram text DEFAULT '';

-- -----------------------------------------------------------------------------
-- legal_pages — оферта, политика конфиденциальности, AML-политика
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) NOT NULL,
  slug text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_published boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(operator_id, slug)
);

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published legal pages" ON public.legal_pages;
CREATE POLICY "Anyone can read published legal pages" ON public.legal_pages
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Operators manage own legal pages" ON public.legal_pages;
CREATE POLICY "Operators manage own legal pages" ON public.legal_pages
  FOR ALL USING (operator_id IN (
    SELECT p.operator_id FROM public.profiles p WHERE p.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- quiz_questions — KYC-онбординг квиз
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active quiz questions" ON public.quiz_questions;
CREATE POLICY "Anyone can read active quiz questions" ON public.quiz_questions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Operators manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Operators manage own quiz questions" ON public.quiz_questions
  FOR ALL USING (operator_id IN (
    SELECT p.operator_id FROM public.profiles p WHERE p.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- site_content — редактируемые тексты hero/features/stats
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(operator_id, section)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
CREATE POLICY "Anyone can read site content"
  ON public.site_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators manage own site content" ON public.site_content;
CREATE POLICY "Operators manage own site content"
  ON public.site_content FOR ALL USING (
    operator_id IN (SELECT p.operator_id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- documents — сгенерированные PDF/Excel
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('order_pdf', 'finnadzor_report', 'cover_letter')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_operator ON public.documents(operator_id);
CREATE INDEX IF NOT EXISTS idx_documents_order ON public.documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own docs" ON public.documents;
CREATE POLICY "Users view own docs" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff view operator docs" ON public.documents;
CREATE POLICY "Staff view operator docs" ON public.documents
  FOR SELECT USING (
    operator_id IN (SELECT operator_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Staff insert docs" ON public.documents;
CREATE POLICY "Staff insert docs" ON public.documents
  FOR INSERT WITH CHECK (
    operator_id IN (SELECT operator_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own docs" ON public.documents;
CREATE POLICY "Users insert own docs" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Storage buckets (branding / order-documents / payment-assets)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-assets', 'payment-assets', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Branding policies
DROP POLICY IF EXISTS "Public read branding" ON storage.objects;
CREATE POLICY "Public read branding" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Auth users manage branding" ON storage.objects;
CREATE POLICY "Auth users manage branding" ON storage.objects
  FOR ALL USING (bucket_id = 'branding' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- order-documents policies
DROP POLICY IF EXISTS "Users upload docs" ON storage.objects;
CREATE POLICY "Users upload docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Users read order docs" ON storage.objects;
CREATE POLICY "Users read order docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'order-documents');

-- payment-assets policies
DROP POLICY IF EXISTS "Operator admins upload payment assets" ON storage.objects;
CREATE POLICY "Operator admins upload payment assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'operator_admin'));

DROP POLICY IF EXISTS "Operator admins delete payment assets" ON storage.objects;
CREATE POLICY "Operator admins delete payment assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'operator_admin'));

DROP POLICY IF EXISTS "Anyone can view payment assets" ON storage.objects;
CREATE POLICY "Anyone can view payment assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'payment-assets');

-- -----------------------------------------------------------------------------
-- is_operator_approved — anonymous approval probe used by ApprovalContext
-- -----------------------------------------------------------------------------
-- Single-tenant build: the function still exists so ApprovalContext
-- doesn't 404, but it always returns true — there's one operator and
-- the box belongs to them, so the approval gate is meaningless.
CREATE OR REPLACE FUNCTION public.is_operator_approved(_operator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

GRANT EXECUTE ON FUNCTION public.is_operator_approved(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- expire_stale_orders — invoked from a cron in upstream platform; here we
-- just install the function so any manual call works. No pg_cron schedule
-- (the OTC supabase project may not have the extension enabled).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET status = 'expired', updated_at = now()
  WHERE status = 'awaiting_payment' AND created_at + interval '30 minutes' < now();

  UPDATE public.pending_payments SET status = 'expired', updated_at = now()
  WHERE status IN ('pending', 'awaiting_payment') AND created_at + interval '30 minutes' < now();
END; $$;

-- -----------------------------------------------------------------------------
-- PostgREST sees new tables only after a NOTIFY pgrst, 'reload schema'.
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
