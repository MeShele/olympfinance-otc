-- Per-tenant флаг "требовать прохождение квиза перед обменом".
-- В OTC-форке модульной системы нет (operator_modules вырезана при extract'е),
-- поэтому свич живёт как обычная колонка company_settings — рядом с другими
-- *_enabled (acquiring_enabled, sumsub_enabled).
--
-- DEFAULT true сохраняет текущее поведение для существующих операторов;
-- новые могут выключить через /admin/company.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS quiz_enabled boolean NOT NULL DEFAULT true;
