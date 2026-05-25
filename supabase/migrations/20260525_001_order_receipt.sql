-- Чек оплаты клиента: SELL-flow клиент перечисляет крипту нам и должен
-- приложить скрин/PDF подтверждения. Поле опциональное.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_url text;

COMMENT ON COLUMN public.orders.receipt_url IS
  'URL квитанции оплаты (приватный signed URL из order-documents bucket). Загружается клиентом перед «Я оплатил».';
