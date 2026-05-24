/**
 * Парсеры order.notes (JSON-блоб с реквизитами заказа).
 *
 * notes — это JSON, в который мы складываем три разных набора данных:
 *  - PaymentInfo (sell/swap): wallet_address оператора, network, payment_url
 *  - BankInfo (sell/swap): bank_name/recipient_name/sender_wallet — куда
 *    клиент хочет получить фиат + его крипто-кошелёк отправителя
 *  - BuyPaymentInfo (buy): payment.bank_details — реквизиты получения,
 *    куда клиент платит фиат
 *
 * Эти парсеры раньше дублировались между OrdersTable (админка) и
 * OrderHistory (клиент), из-за чего клиентский PDF не показывал часть
 * полей, которые видел оператор. Источник данных один — парсеры тоже.
 */

export interface PaymentInfo {
  payment_id?: string;
  wallet_address?: string;
  network?: string;
  expires_at?: string;
  payment_url?: string;
}

export interface BankInfo {
  bank_name?: string;
  recipient_name?: string;
  sender_wallet?: string;
  user_notes?: string;
}

export interface BuyPaymentInfo {
  bankDetails: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
}

/**
 * Достаёт `payment_method` ('cash' | 'cashless') из notes JSON.
 * Возвращает null если поля нет (для legacy ордеров).
 */
export const extractPaymentMethod = (notes: string | null | undefined): 'cash' | 'cashless' | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    const v = parsed?.paymentMethod;
    if (v === 'cash' || v === 'cashless') return v;
    return null;
  } catch {
    return null;
  }
};

/**
 * Русский ярлык способа оплаты для PDF-чека.
 * Приоритет на структурированное поле order.payment_method (новые ордера),
 * fallback на JSON-парсинг notes (legacy).
 */
export const formatPaymentMethod = (order: { payment_method?: string | null; notes?: string | null } | null | undefined): string => {
  if (!order) return '—';
  const raw = order.payment_method ?? extractPaymentMethod(order.notes);
  if (raw === 'cash') return 'наличный';
  if (raw === 'cashless') return 'безналичный';
  return '—';
};

export const parsePaymentInfo = (notes: string | null): PaymentInfo | null => {
  if (!notes) return null;
  try {
    return JSON.parse(notes) as PaymentInfo;
  } catch {
    return null;
  }
};

export const parseBankInfo = (notes: string | null): BankInfo | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed.bank_name || parsed.recipient_name || parsed.sender_wallet) {
      return parsed as BankInfo;
    }
    return null;
  } catch {
    return null;
  }
};

export const parseBuyPaymentInfo = (notes: string | null): BuyPaymentInfo | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed?.payment?.type === 'fiat' && parsed.payment.bank_details) {
      return {
        bankDetails: parsed.payment.bank_details,
        amount: parsed.payment.amount,
        currency: parsed.payment.currency,
        expiresAt: parsed.payment.expires_at,
      };
    }
    return null;
  } catch {
    return null;
  }
};
