-- GSFR-отчёт: закрытие критичных gap'ов в данных.
-- compliance_data уже существует со всеми колонками + RLS — не трогаем.
-- Добавляем только:
--   1. profiles.relationship_purpose — цель деловых отношений (ст. 21.1.2)
--   2. orders.payment_method — наличный/безналичный (для Приложений 4/о, 5/о)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS relationship_purpose text;

COMMENT ON COLUMN public.profiles.relationship_purpose IS
  'Цель деловых отношений (ст. 21.1.2 закона КР 87/2018): personal_use, investment, business, savings, other.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text;

COMMENT ON COLUMN public.orders.payment_method IS
  'Метод расчёта: cash | cashless. Идёт в колонку 9 Приложений 4/о, 5/о.';
