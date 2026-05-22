-- OTC payout audit columns + RPC mark_order_completed (processing → completed).
-- В отличие от main платформы (paid → completed) в OTC после "Я оплатил" ордер
-- сразу идёт в processing — этот RPC закрывает его в completed.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payout_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.mark_order_completed(
  p_order_id UUID,
  p_payout_tx_hash TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller   UUID := auth.uid();
  _is_admin BOOLEAN := COALESCE(public.has_role(_caller, 'admin'::public.app_role), false)
                    OR COALESCE(public.has_role(_caller, 'operator_admin'::public.app_role), false);
  _hash     TEXT := NULLIF(trim(p_payout_tx_hash), '');
  _rows     INT;
BEGIN
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  UPDATE public.orders SET
    status              = 'completed',
    payout_tx_hash      = COALESCE(_hash, payout_tx_hash),
    payout_completed_at = now(),
    completed_by        = _caller,
    updated_at          = now()
  WHERE id = p_order_id AND status = 'processing';

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RAISE EXCEPTION 'order not found or not in processing status';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_completed(uuid, text) TO authenticated;
