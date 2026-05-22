-- ============================================================
-- Olymp Finance OTC — initial seed (run once after init-otc-db.sql)
-- ============================================================
-- Creates the single tenant the app expects (DEFAULT_OPERATOR_ID
-- matches the constant baked into OperatorContext) and a starter
-- currency catalog. Adjust rates/min/max in admin once running.
--
-- Idempotent via WHERE NOT EXISTS so it's safe to re-run.
-- ============================================================

-- 1. Default operator
INSERT INTO public.operators (id, name)
SELECT '00000000-0000-0000-0000-000000000001', 'Olymp Finance'
WHERE NOT EXISTS (
  SELECT 1 FROM public.operators WHERE id = '00000000-0000-0000-0000-000000000001'
);

-- 2. Company settings stub so /admin/company doesn't 404 on first load
INSERT INTO public.company_settings (operator_id, company_name, email)
SELECT '00000000-0000-0000-0000-000000000001', 'Olymp Finance', 'support@olympfinance.kg'
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings
  WHERE operator_id = '00000000-0000-0000-0000-000000000001'
);

-- 3. Starter currencies — fiat (KGS, USD, RUB) + popular crypto
INSERT INTO public.currencies (
  code, name, icon, type, rate_to_usd,
  min_amount, max_amount, fee_percent, is_active, sort_order, operator_id
)
SELECT
  c.code, c.name, c.icon, c.type, c.rate_to_usd,
  c.min_amount, c.max_amount, c.fee_percent, c.is_active, c.sort_order,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM (VALUES
  ('KGS', 'Кыргызский сом',  '🇰🇬', 'fiat',   0.011,  1000.0,  1000000.0, 2.5, true, 1),
  ('USD', 'Доллар США',       '🇺🇸', 'fiat',   1.0,    50.0,    100000.0,  2.5, true, 2),
  ('RUB', 'Российский рубль', '🇷🇺', 'fiat',   0.011,  500.0,   500000.0,  2.5, true, 3),
  ('USDT','Tether USD',       '💵', 'crypto', 1.0,    10.0,    50000.0,   1.5, true, 4),
  ('USDC','USD Coin',         '🪙', 'crypto', 1.0,    10.0,    50000.0,   1.5, true, 5),
  ('BTC', 'Bitcoin',          '₿',  'crypto', 100000.0, 0.0001,10.0,      1.5, true, 6),
  ('ETH', 'Ethereum',         'Ξ',  'crypto', 4000.0, 0.001,   100.0,     1.5, true, 7)
) AS c (code, name, icon, type, rate_to_usd, min_amount, max_amount, fee_percent, is_active, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.currencies cc
  WHERE cc.code = c.code
    AND cc.operator_id = '00000000-0000-0000-0000-000000000001'
);
