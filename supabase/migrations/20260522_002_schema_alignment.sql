-- Brand columns
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_dark_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_preset text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS card_color TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS border_radius TEXT DEFAULT '12',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- site_content section builder
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT 'default';

-- Seed default sections для существующего оператора
INSERT INTO public.site_content (operator_id, section, content, display_order, is_enabled, variant)
SELECT o.id, s.section, s.content, s.display_order, true, 'default'
FROM public.operators o
CROSS JOIN (VALUES
  ('hero', '{}'::jsonb, 1),
  ('stats', '{}'::jsonb, 2),
  ('features', '{}'::jsonb, 3),
  ('currencies', '{}'::jsonb, 4),
  ('cta', '{}'::jsonb, 5)
) AS s(section, content, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content sc WHERE sc.operator_id = o.id AND sc.section = s.section
);
