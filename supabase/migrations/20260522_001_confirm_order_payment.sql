CREATE OR REPLACE FUNCTION public.confirm_order_payment(_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows INT;
  _is_admin BOOLEAN;
BEGIN
  -- Admins / operator_admins могут подтвердить любой ордер
  _is_admin := COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
            OR COALESCE(public.has_role(auth.uid(), 'operator_admin'::public.app_role), false);

  -- 1) orders (BUY / SWAP)
  IF _is_admin THEN
    UPDATE public.orders SET status='processing', updated_at=now()
    WHERE id=_order_id AND status='awaiting_payment';
  ELSE
    UPDATE public.orders SET status='processing', updated_at=now()
    WHERE id=_order_id AND user_id=auth.uid() AND status='awaiting_payment';
  END IF;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows > 0 THEN RETURN; END IF;

  -- 2) pending_payments (SELL)
  IF _is_admin THEN
    UPDATE public.pending_payments SET status='processing', updated_at=now()
    WHERE id=_order_id AND status IN ('pending','awaiting_payment');
  ELSE
    UPDATE public.pending_payments SET status='processing', updated_at=now()
    WHERE id=_order_id AND user_id=auth.uid() AND status IN ('pending','awaiting_payment');
  END IF;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows > 0 THEN RETURN; END IF;

  RAISE EXCEPTION 'Order not found or already confirmed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid) TO authenticated;
