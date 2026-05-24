-- Резидентство клиента (для разделения резидент/нерезидент в отчётах ГСФР).
-- NULL = не указано (новый flow попросит юзера при первом входе),
-- true  = резидент КР,
-- false = нерезидент.
--
-- До этого фронт вычислял резидентство динамически из
-- kyc_verifications.document_country = 'KGZ', но это страна *документа*,
-- а не *налогового резидентства* — может расходиться (гражданин КР живёт
-- за границей > 183 дней и т.п.). Теперь резидентство — явный выбор клиента,
-- с fallback на старую логику для legacy-юзеров без KYC.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_resident boolean;

-- Backfill: тем у кого уже есть approved-KYC, проставляем по стране документа.
-- Это разовая инициализация; новые юзеры идут через UI-шаг.
UPDATE public.profiles p
SET is_resident = (kv.document_country = 'KGZ')
FROM public.kyc_verifications kv
WHERE kv.user_id = p.user_id
  AND kv.status = 'approved'
  AND p.is_resident IS NULL
  AND kv.document_country IS NOT NULL;

COMMENT ON COLUMN public.profiles.is_resident IS
  'Налоговый резидент КР? true/false. NULL = клиент ещё не указал.';
