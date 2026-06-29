-- FIX: регистрация падала на одно-тенантных OTC-десках (fiatex/olymp).
--
-- handle_new_user (триггер on_auth_user_created) резолвил operator_id по домену через
-- public.operator_domains — МУЛЬТИТЕНАНТНУЮ таблицу, которой на одно-тенантных десках НЕТ.
-- Каждый signup бил по триггеру → ERROR 42P01 (relation does not exist) → транзакция auth.users
-- откатывалась → GoTrue "500: Database error saving new user" → во фронте «Сервис временно
-- недоступен». Регистрация была мертва на десках.
--
-- Делаем резолв-по-домену УСТОЙЧИВЫМ: выполняем только если operator_domains существует
-- (to_regclass guard + динамический EXECUTE, чтобы статический план не резолвил отсутствующую
-- таблицу). На десках блок пропускается → оператор берётся из company_settings/operators.
-- На main (таблица есть) поведение идентично прежнему. Одна функция на всех хостах, без дрейфа.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _operator_id uuid;
  _domain text;
BEGIN
  -- 1. Явный operator_id из metadata (register-operator / create-staff / admin)
  _operator_id := (NEW.raw_user_meta_data->>'operator_id')::uuid;

  -- 2. Резолв по домену регистрации — ТОЛЬКО если operator_domains существует (мультитенант main).
  IF _operator_id IS NULL AND to_regclass('public.operator_domains') IS NOT NULL THEN
    _domain := NEW.raw_user_meta_data->>'signup_domain';
    IF _domain IS NOT NULL AND _domain <> '' THEN
      EXECUTE 'SELECT operator_id FROM public.operator_domains WHERE domain = $1 LIMIT 1'
        INTO _operator_id USING _domain;
    END IF;
  END IF;

  -- 3. Fallback: оператор с настроенным company_settings (основной путь на одно-тенантных десках)
  IF _operator_id IS NULL THEN
    SELECT cs.operator_id INTO _operator_id FROM public.company_settings cs LIMIT 1;
  END IF;

  -- 4. Последний резерв: любой оператор
  IF _operator_id IS NULL THEN
    SELECT id INTO _operator_id FROM public.operators ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, operator_id)
  VALUES (NEW.id, NEW.email, _operator_id)
  ON CONFLICT (user_id) DO UPDATE
    SET operator_id = COALESCE(public.profiles.operator_id, EXCLUDED.operator_id);

  RETURN NEW;
END;
$function$;
