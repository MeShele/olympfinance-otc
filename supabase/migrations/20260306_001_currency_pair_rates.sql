-- Currency pair rates: direct fiat→crypto rate per pair + optional markup
CREATE TABLE IF NOT EXISTS public.currency_pair_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiat_currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE CASCADE,
  crypto_currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE CASCADE,
  rate NUMERIC NOT NULL,             -- price of 1 crypto in fiat (e.g. 97500 for BTC/USD)
  operator_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fiat_currency_id, crypto_currency_id, operator_id)
);

ALTER TABLE public.currency_pair_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for calculator)
CREATE POLICY "pair_rates_select" ON public.currency_pair_rates
  FOR SELECT USING (true);

-- Admins and staff with currencies.edit permission can manage
CREATE POLICY "pair_rates_admin_manage" ON public.currency_pair_rates
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'operator_admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );

CREATE POLICY "pair_rates_admin_update" ON public.currency_pair_rates
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'operator_admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );

CREATE POLICY "pair_rates_admin_delete" ON public.currency_pair_rates
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'operator_admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );
