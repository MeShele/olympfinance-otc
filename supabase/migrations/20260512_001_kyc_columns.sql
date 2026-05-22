-- =============================================================================
-- Расширение kyc_verifications под manual-KYC flow OTC.
-- =============================================================================
-- Edge function `asystem-kyc` (action=verify) сохраняет полный пакет данных
-- по заявке — оператор смотрит их в /admin/compliance чтобы принять решение.
-- Также добавляем UNIQUE(user_id) чтобы upsert работал корректно.
-- =============================================================================

ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'asystem',
  ADD COLUMN IF NOT EXISTS ocr_data jsonb,
  ADD COLUMN IF NOT EXISTS liveness_passed boolean,
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS risk_factors jsonb,
  ADD COLUMN IF NOT EXISTS face_match_score numeric,
  ADD COLUMN IF NOT EXISTS sanctions_hit boolean DEFAULT false;

-- One verification row per user — UPSERT by user_id needs this index.
CREATE UNIQUE INDEX IF NOT EXISTS kyc_verifications_user_id_uniq
  ON public.kyc_verifications(user_id);

NOTIFY pgrst, 'reload schema';
